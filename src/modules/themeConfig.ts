import { ThemeModule } from '../types';
import { getFile, putFile, removeFile } from './api';
import { logging } from './logger';
import { isReadOnly } from './utils';

/** 配置值类型 */
export type ConfigValue = string | number | boolean | null;

/** 配置对象类型（单层键值） */
export interface ConfigObject {
    [key: string]: ConfigValue;
}

/** 配置文件版本 */
const CONFIG_VERSION = 2;

/** 是否启用 Google Analytics 数据收集 */
export const CONFIG_KEY_ANALYTICS_ENABLE = 'analytics_enable';
/** Google Analytics 上次发送数据的时间戳（毫秒） */
export const CONFIG_KEY_ANALYTICS_LAST_SENT_TIMESTAMP = 'analytics_last_sent_timestamp';
/** 主题首次安装时间戳（毫秒），用于首次安装一天内不发送 GA 数据 */
export const CONFIG_KEY_INSTALL_TIMESTAMP = 'install_timestamp';
/** 是否在启动后显示设备类型等调试消息 */
export const CONFIG_KEY_DEBUG_SHOW_MESSAGE = 'debug_show_message';

/** 默认配置（schema 类型由此推导） */
const DEFAULT_CONFIG = {
    version: CONFIG_VERSION,
    [CONFIG_KEY_ANALYTICS_ENABLE]: true,
    [CONFIG_KEY_ANALYTICS_LAST_SENT_TIMESTAMP]: 0,
    [CONFIG_KEY_INSTALL_TIMESTAMP]: 0,
    [CONFIG_KEY_DEBUG_SHOW_MESSAGE]: false,
} as const;

/** 将 as const 的字面量类型放宽为 boolean / number，便于 set 写入任意合法值 */
export type ThemeConfigSchema = {
    [K in keyof typeof DEFAULT_CONFIG]: (typeof DEFAULT_CONFIG)[K] extends boolean
        ? boolean
        : number;
};

export type ThemeConfigKey = keyof typeof DEFAULT_CONFIG;

/** 值为 boolean 的配置键 */
export type BooleanConfigKey = {
    [K in ThemeConfigKey]: ThemeConfigSchema[K] extends boolean ? K : never;
}[ThemeConfigKey];

/** 布尔配置项菜单图标（未指定时使用 iconSettings） */
const BOOLEAN_CONFIG_ICONS: Partial<Record<BooleanConfigKey, string>> = {
    [CONFIG_KEY_ANALYTICS_ENABLE]: 'iconCloud',
    [CONFIG_KEY_DEBUG_SHOW_MESSAGE]: 'iconInfo',
};

/** 可在菜单中切换的布尔配置键 */
export const BOOLEAN_CONFIG_KEYS = (Object.keys(DEFAULT_CONFIG) as ThemeConfigKey[]).filter(
    (key): key is BooleanConfigKey => typeof DEFAULT_CONFIG[key] === 'boolean',
);

export function getBooleanConfigMenuIcon(key: BooleanConfigKey): string {
    return BOOLEAN_CONFIG_ICONS[key] ?? 'iconSettings';
}

export function getBooleanKeyFromSwitch(target: EventTarget | null): BooleanConfigKey | null {
    if (!(target instanceof HTMLInputElement) || !target.classList.contains('b3-switch')) {
        return null;
    }
    return isBooleanConfigKey(target.id) ? target.id : null;
}

export function createSwitchChangeHandler(config: ThemeConfig): (event: Event) => void {
    return (event: Event) => {
        const key = getBooleanKeyFromSwitch(event.target);
        if (!key) {
            return;
        }
        config.set(key, (event.target as HTMLInputElement).checked);
        event.stopPropagation();
    };
}

function isBooleanConfigKey(key: string): key is BooleanConfigKey {
    return (BOOLEAN_CONFIG_KEYS as readonly string[]).includes(key);
}

function getDefaultValue<K extends ThemeConfigKey>(key: K): ThemeConfigSchema[K] {
    return DEFAULT_CONFIG[key] as ThemeConfigSchema[K];
}

/**
 * 合并默认配置，仅填充缺失的键
 */
function mergeDefaults(target: ConfigObject, defaults: ConfigObject): ConfigObject {
    const result: ConfigObject = { ...target };
    for (const key in defaults) {
        if (result[key] === undefined) {
            result[key] = defaults[key];
        }
    }
    return result;
}

/**
 * 创建响应式配置对象，属性修改时自动触发保存与变更通知
 */
function createReactiveConfig(
    target: ConfigObject,
    onSave: () => void,
    onChange: (key: string, value: ConfigValue) => void,
): ConfigObject {
    const processedTarget: ConfigObject = { ...target };

    return new Proxy(processedTarget, {
        set(obj: ConfigObject, prop: string | symbol, value: ConfigValue): boolean {
            const propKey = prop as string;
            obj[propKey] = value;
            onChange(propKey, value);
            onSave();
            return true;
        },

        deleteProperty(obj: ConfigObject, prop: string | symbol): boolean {
            const propKey = prop as string;
            delete obj[propKey];
            onChange(propKey, undefined as unknown as ConfigValue);
            onSave();
            return true;
        },
    });
}

/**
 * 将 v1 嵌套配置升级为 v2 单层结构
 */
function upgradeConfigV1ToV2(config: ConfigObject): ConfigObject {
    const upgraded: ConfigObject = {
        version: CONFIG_VERSION,
    };

    const theme = config.theme;
    if (theme && typeof theme === 'object') {
        const themeSection = theme as Record<string, unknown>;
        const googleAnalytics = themeSection.googleAnalytics;
        if (googleAnalytics && typeof googleAnalytics === 'object') {
            const gaSection = googleAnalytics as Record<string, unknown>;
            if (typeof gaSection.disableGoogleAnalytics === 'boolean') {
                upgraded[CONFIG_KEY_ANALYTICS_ENABLE] = !gaSection.disableGoogleAnalytics;
            }
            if (typeof gaSection.lastSentTimestamp === 'number') {
                upgraded[CONFIG_KEY_ANALYTICS_LAST_SENT_TIMESTAMP] = gaSection.lastSentTimestamp;
            }
        }

        const debug = themeSection.debug;
        if (debug && typeof debug === 'object') {
            const debugSection = debug as Record<string, unknown>;
            if (typeof debugSection.showMessage === 'boolean') {
                upgraded[CONFIG_KEY_DEBUG_SHOW_MESSAGE] = debugSection.showMessage;
            }
        }
    }

    return mergeDefaults(upgraded, { ...DEFAULT_CONFIG });
}

/**
 * 主题配置：读写配置、变更通知
 */
export class ThemeConfig implements ThemeModule {
    private static instance: ThemeConfig | null = null;

    private readonly configPath = '/conf/whisper-theme-config.json';
    private _config: ConfigObject = {};
    private initialized = false;
    private writeTimer: ReturnType<typeof setTimeout> | null = null;
    private writePending = false;

    private configChangeListeners = new Map<string, Set<(value: ConfigValue) => void>>();

    static getInstance(): ThemeConfig {
        if (!this.instance) {
            this.instance = new ThemeConfig();
        }
        return this.instance;
    }

    private constructor() {}

    async init(): Promise<void> {
        try {
            await this.loadFromFile();
        } catch (e) {
            logging.error(`Theme config init failed: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    destroy(): void {
        this.configChangeListeners.clear();
    }

    /** 读取配置项，缺失时回退到默认配置 */
    get<K extends ThemeConfigKey>(key: K): ThemeConfigSchema[K] {
        const defaultValue = getDefaultValue(key);
        if (!this.initialized) {
            return defaultValue as ThemeConfigSchema[K];
        }

        const value = this._config[key as string];
        if (value !== undefined) {
            return value as ThemeConfigSchema[K];
        }
        return defaultValue as ThemeConfigSchema[K];
    }

    /** 写入配置项（非只读模式下自动保存） */
    set<K extends ThemeConfigKey>(key: K, value: ThemeConfigSchema[K]): void {
        if (!this.initialized) {
            logging.warn('Config not initialized, set() ignored.');
            return;
        }
        this._config[key as string] = value as ConfigValue;
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

    async deleteConfigFile(): Promise<boolean> {
        if (isReadOnly()) {
            logging.error('Deleting configuration file is not supported in publish service');
            return false;
        }

        try {
            const result = await removeFile(this.configPath);
            if (result.code === 0) {
                this.assignConfig(JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as ConfigObject);
                this.initialized = false;
                logging.info(`Configuration file deleted successfully: ${this.configPath}`);
                return true;
            }

            logging.error(`Failed to delete configuration file: ${result.msg}`);
            return false;
        } catch (e) {
            logging.error(`Delete configuration file exception: ${e instanceof Error ? e.message : String(e)}`);
            return false;
        }
    }

    private async loadFromFile(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            const content = await getFile(this.configPath, {
                retryOnConnectivityError: true,
                retryInterval: 5000,
                maxRetries: 100,
            });

            let parsedConfig: ConfigObject;
            let shouldSave = false;

            if (typeof content === 'string' && content.trim() !== '') {
                const rawConfig = JSON.parse(content) as ConfigObject;

                if (rawConfig.version === 1) {
                    parsedConfig = upgradeConfigV1ToV2(rawConfig);
                    shouldSave = true;
                } else {
                    parsedConfig = mergeDefaults(rawConfig, { ...DEFAULT_CONFIG });
                    parsedConfig.version = CONFIG_VERSION;
                    shouldSave = rawConfig.version !== CONFIG_VERSION;
                }
            } else {
                parsedConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as ConfigObject;
                parsedConfig[CONFIG_KEY_INSTALL_TIMESTAMP] = Date.now();
                shouldSave = true;
            }

            this.assignConfig(parsedConfig);
            this.initialized = true;

            if (!isReadOnly() && shouldSave) {
                await this.saveToFile();
            }
        } catch (e) {
            logging.error(`Failed to load config: ${e instanceof Error ? e.message : String(e)}`);
            const fallbackConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as ConfigObject;
            fallbackConfig[CONFIG_KEY_INSTALL_TIMESTAMP] = Date.now();
            this.assignConfig(fallbackConfig);
            this.initialized = true;
            await this.saveToFile();
        }
    }

    private assignConfig(data: ConfigObject): void {
        this._config = isReadOnly()
            ? data
            : createReactiveConfig(data, () => {
                void this.saveToFile();
            }, (key, value) => {
                this.emitConfigChanged(key, value);
            });
    }

    private async saveToFile(): Promise<boolean> {
        if (isReadOnly()) {
            return false;
        }

        if (this.writeTimer) {
            clearTimeout(this.writeTimer);
        }

        if (this.writePending) {
            return true;
        }

        return new Promise((resolve) => {
            this.writePending = true;
            this.writeTimer = setTimeout(async () => {
                try {
                    const configToSave = JSON.parse(JSON.stringify(this._config)) as ConfigObject;
                    const result = await putFile(this.configPath, {
                        isDir: false,
                        modTime: Math.floor(Date.now() / 1000),
                        file: new Blob([JSON.stringify(configToSave, null, 2)], { type: 'application/json' }),
                    });

                    this.writePending = false;
                    resolve(result.code === 0);
                } catch (e) {
                    logging.error(`Failed to save config: ${e instanceof Error ? e.message : String(e)}`);
                    this.writePending = false;
                    resolve(false);
                }
            }, 300);
        });
    }

    private emitConfigChanged(key: string, value: ConfigValue): void {
        this.configChangeListeners.get(key)?.forEach(listener => {
            listener(value);
        });
    }
}
