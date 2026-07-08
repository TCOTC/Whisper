import { ThemeModule } from '../types';
import { getFile, getLocalStorageVal, removeFile, removeLocalStorageVal, setLocalStorageVal } from './api';
import { logging } from './logger';
import { isReadOnly } from './utils';

/** 配置值类型 */
export type ConfigValue = string | number | boolean | null;

/** 配置对象类型（单层键值） */
export interface ConfigObject {
    [key: string]: ConfigValue;
}

/** LocalStorage 键名 */
export const CONFIG_STORAGE_KEY = 'whisper-theme-config-v2';

type ConfigFieldDef =
    | { type: 'boolean'; default: boolean; menu?: { icon: string; group: string } }
    | { type: 'number'; default: number | (() => number) }
    | { type: 'string'; default: string | (() => string) };

/** 主题配置声明（单一数据源：键名、类型、默认值、菜单元数据） */
export const THEME_CONFIG_SCHEMA = {
    /** 明亮模式界面配色（对应 data-whisper-appearance；空字符串表示原生，不写属性） */
    appearance_light: {
        type: 'string',
        default: 'blush',
    },
    /** 暗黑模式界面配色（对应 data-whisper-appearance；空字符串表示原生，不写属性） */
    appearance_dark: {
        type: 'string',
        default: 'graphite',
    },
    /** 文本配色方案（对应 data-whisper-text；空字符串表示原生，不写属性、不附加样式） */
    text: {
        type: 'string',
        default: 'seven',
    },
    /** 主题首次安装时间戳（毫秒），用于首次安装一天内不发送 GA 数据 */
    install_timestamp: {
        type: 'number',
        default: () => Date.now(),
    },
    /** 文本半高背景（对应 data-whisper-text-half-bg） */
    text_half_bg: {
        type: 'boolean',
        default: true,
        menu: { icon: 'iconFont', group: 'feature' },
    },
    /** Google Analytics 上次发送数据的时间戳（毫秒） */
    analytics_last_sent_timestamp: {
        type: 'number',
        default: 0,
    },
    /** 是否启用 Google Analytics 数据收集 */
    analytics_enable: {
        type: 'boolean',
        default: true,
        menu: { icon: 'iconCloud', group: 'general' },
    },
    /** 是否在启动后显示设备类型等调试消息 */
    debug_show_message: {
        type: 'boolean',
        default: false,
        menu: { icon: 'iconInfo', group: 'general' },
    },
} as const satisfies Record<string, ConfigFieldDef>;

export type ThemeConfigKey = keyof typeof THEME_CONFIG_SCHEMA;

type ConfigFieldType<T extends ConfigFieldDef> =
    T extends { type: 'boolean' } ? boolean :
    T extends { type: 'number' } ? number :
    string;

export type ThemeConfigSchema = {
    [K in ThemeConfigKey]: ConfigFieldType<(typeof THEME_CONFIG_SCHEMA)[K]>;
};

/** 带 menu 的 boolean 配置键 */
export type MenuConfigKey = {
    [K in ThemeConfigKey]: (typeof THEME_CONFIG_SCHEMA)[K] extends { type: 'boolean'; menu: { icon: string } }
        ? K
        : never;
}[ThemeConfigKey];

export type MenuItemDef = { key: MenuConfigKey; icon: string };

function collectMenuGroups(): Map<string, MenuItemDef[]> {
    const groups = new Map<string, MenuItemDef[]>();

    for (const key of Object.keys(THEME_CONFIG_SCHEMA) as ThemeConfigKey[]) {
        const field = THEME_CONFIG_SCHEMA[key];
        if (field.type !== 'boolean' || !('menu' in field)) {
            continue;
        }

        const group = field.menu.group;
        const items = groups.get(group);
        const item = { key: key as MenuConfigKey, icon: field.menu.icon };

        if (items) {
            items.push(item);
        } else {
            groups.set(group, [item]);
        }
    }

    return groups;
}

const MENU_GROUP_MAP = collectMenuGroups();

/** 按 group 分段的菜单项（顺序为 schema 中各 group 首次出现的顺序） */
export const THEME_CONFIG_MENU_GROUPS: readonly MenuItemDef[][] = [...MENU_GROUP_MAP.values()];

/** 样式特性菜单项 */
export const THEME_CONFIG_FEATURE_MENU_ITEMS = MENU_GROUP_MAP.get('feature') ?? [];

/** 将分组菜单项映射为片段，组间自动插入 separator */
export function flatMapMenuGroups<T>(
    groups: readonly MenuItemDef[][],
    options: {
        leading?: () => T;
        separator?: () => T;
        item: (item: MenuItemDef) => T;
    },
): T[] {
    const parts: T[] = [];

    if (options.leading) {
        parts.push(options.leading());
    }

    groups.forEach((items, index) => {
        if (index > 0 && options.separator) {
            parts.push(options.separator());
        }
        for (const item of items) {
            parts.push(options.item(item));
        }
    });

    return parts;
}

/** 默认配置（由 schema 在模块加载时生成；install_timestamp 在此时记录） */
const DEFAULT_CONFIG = Object.fromEntries(
    (Object.keys(THEME_CONFIG_SCHEMA) as ThemeConfigKey[]).map((key) => {
        const { default: defaultValue } = THEME_CONFIG_SCHEMA[key];
        return [key, typeof defaultValue === 'function' ? defaultValue() : defaultValue];
    }),
) as ConfigObject;

/**
 * 合并默认配置：填充缺失键、纠正非法值、丢弃未知键
 */
function mergeDefaults(target: ConfigObject, defaults: ConfigObject): {
    config: ConfigObject;
    needsWriteBack: boolean;
} {
    const result: ConfigObject = {};

    for (const key in defaults) {
        const defaultValue = defaults[key];
        const rawValue = target[key];

        if (rawValue !== undefined && typeof rawValue === typeof defaultValue) {
            result[key] = rawValue;
            continue;
        }

        if (rawValue !== undefined) {
            logging.warn(`Invalid config value for "${key}", using default`);
        }
        result[key] = defaultValue;
    }

    const needsWriteBack =
        Object.keys(target).some((key) => !(key in defaults)) ||
        Object.keys(defaults).some((key) => target[key] !== result[key]);

    return { config: result, needsWriteBack };
}

/**
 * 主题配置：读写配置、变更通知
 */
export class ThemeConfig implements ThemeModule {
    private static instance: ThemeConfig | null = null;

    private _config: ConfigObject = {};
    private initialized = false;

    private configChangeListeners = new Map<string, Set<(value: ConfigValue) => void>>();

    static getInstance(): ThemeConfig {
        if (!this.instance) {
            this.instance = new ThemeConfig();
        }
        return this.instance;
    }

    private constructor() {}

    async init(): Promise<void> {
        if (this.initialized) {
            return;
        }

        const result = await getLocalStorageVal(CONFIG_STORAGE_KEY);
        let config: ConfigObject;
        let needsWriteBack: boolean;

        // 存储值为合法普通对象：合并默认值（补缺失键、纠正非法值）
        if (
            result.code === 0
            && typeof result.data === 'object'
            && result.data !== null
            && !Array.isArray(result.data)
        ) {
            ({ config, needsWriteBack } = mergeDefaults(result.data as ConfigObject, DEFAULT_CONFIG));
        } else {
            // 键不存在、API 失败或数据格式不对：回退默认配置并写回
            if (result.code !== 0) {
                logging.error(`Failed to load config: ${result.msg}`);
            } else if (result.data != null) {
                logging.error('Failed to load config: stored value is not a config object');
            }
            config = { ...DEFAULT_CONFIG };
            needsWriteBack = true;
        }

        this._config = config;
        this.initialized = true;

        if (needsWriteBack && !isReadOnly()) {
            const saveResult = await setLocalStorageVal(CONFIG_STORAGE_KEY, { ...this._config });
            if (saveResult.code !== 0) {
                logging.error('Failed to write back normalized config');
            }
        }
    }

    destroy(): void {
        this.configChangeListeners.clear();
    }

    /** 读取配置项，缺失时回退到默认配置 */
    get<K extends ThemeConfigKey>(key: K): ThemeConfigSchema[K] {
        const value = this._config[key as string];
        if (value !== undefined) {
            return value as ThemeConfigSchema[K];
        }
        return DEFAULT_CONFIG[key] as ThemeConfigSchema[K];
    }

    /** 写入配置项（非只读模式下自动保存） */
    set<K extends ThemeConfigKey>(key: K, value: ThemeConfigSchema[K]): void {
        if (!this.initialized) {
            logging.warn('Config not initialized, set() ignored.');
            return;
        }
        this._config[key as string] = value as ConfigValue;
        this.configChangeListeners.get(key as string)?.forEach(listener => {
            listener(value as ConfigValue);
        });
        if (!isReadOnly()) {
            void setLocalStorageVal(CONFIG_STORAGE_KEY, { ...this._config }).then((result) => {
                if (result.code !== 0) {
                    logging.error(`Failed to save config: ${result.msg}`);
                }
            });
        }
    }

    onConfigChanged<K extends ThemeConfigKey>(
        key: K,
        listener: (value: ThemeConfigSchema[K]) => void,
    ): void {
        if (!this.configChangeListeners.has(key)) {
            this.configChangeListeners.set(key, new Set());
        }
        this.configChangeListeners.get(key)!.add(listener as (value: ConfigValue) => void);
    }

    offConfigChanged<K extends ThemeConfigKey>(
        key: K,
        listener: (value: ThemeConfigSchema[K]) => void,
    ): void {
        this.configChangeListeners.get(key)?.delete(listener as (value: ConfigValue) => void);
    }

    /** 卸载主题时删除 LocalStorage 中的配置 */
    async deleteConfig(): Promise<boolean> {
        const result = await removeLocalStorageVal(CONFIG_STORAGE_KEY);
        if (result.code === 0) {
            this._config = { ...DEFAULT_CONFIG };
            logging.info(`Configuration removed successfully: ${CONFIG_STORAGE_KEY}`);
            return true;
        }

        logging.error(`Failed to remove configuration: ${result.msg}`);
        return false;
    }

    /** 删除旧版配置文件（若存在） */
    async removeLegacyConfigFile(): Promise<void> {
        // 旧版配置文件路径
        const legacyConfigPath = '/conf/whisper-theme-config.json';

        const content = await getFile(legacyConfigPath);
        if (typeof content !== 'string') {
            return;
        }

        // 需要先获取再删除是因为直接调用 removeFile 接口会触发内核 IncSync
        const result = await removeFile(legacyConfigPath);
        if (result.code === 0) {
            logging.info(`Legacy configuration file removed: ${legacyConfigPath}`);
        } else {
            logging.error(`Failed to remove legacy configuration file: ${result.msg}`);
        }
    }
}
