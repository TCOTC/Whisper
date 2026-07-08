import { ThemeModule } from '../types';
import { THEME_CONFIG_SCHEMA, ThemeConfig, ThemeConfigKey } from './themeConfig';
import { logging } from './logger';
import { syncAttr } from './utils';

/** 配色方案配置键 */
export type SchemeConfigKey = Extract<ThemeConfigKey, 'appearance_light' | 'appearance_dark' | 'text'>;

export type SchemeOptionDef = {
    value: string;
    labelKey: string;
};

export type SchemeMenuDef = {
    key: SchemeConfigKey;
    icon: string;
    options: readonly SchemeOptionDef[];
};

/** 配色方案菜单定义（单一数据源：合法取值与菜单选项） */
export const SCHEME_MENU_DEFS: readonly SchemeMenuDef[] = [
    {
        key: 'appearance_light',
        icon: 'iconLight',
        options: [
            { value: '', labelKey: 'scheme_native' },
            { value: 'blush', labelKey: 'scheme_blush' },
        ],
    },
    {
        key: 'appearance_dark',
        icon: 'iconDark',
        options: [
            { value: '', labelKey: 'scheme_native' },
            { value: 'graphite', labelKey: 'scheme_graphite' },
        ],
    },
    {
        key: 'text',
        icon: 'iconFont',
        options: [
            { value: '', labelKey: 'scheme_native' },
            { value: 'rainbow', labelKey: 'scheme_rainbow' },
        ],
    },
];

/** 各配置键对应的合法方案名（空字符串表示原生） */
export const VALID_SCHEMES = SCHEME_MENU_DEFS.reduce<Record<SchemeConfigKey, readonly string[]>>((acc, def) => {
    acc[def.key] = def.options.map((option) => option.value);
    return acc;
}, {} as Record<SchemeConfigKey, readonly string[]>);

const SCHEME_KEYS = Object.keys(VALID_SCHEMES) as SchemeConfigKey[];

/** 校验方案名；非法时回退默认并写回 ThemeConfig */
function resolveScheme(config: ThemeConfig, key: SchemeConfigKey): string {
    const raw = config.get(key);
    if (VALID_SCHEMES[key].includes(raw)) {
        return raw;
    }

    const fallback = THEME_CONFIG_SCHEMA[key].default as string;
    logging.warn(`Unknown scheme "${raw}" for "${key}", using default "${fallback}"`);
    config.set(key, fallback);
    return fallback;
}

function applySchemeAttributes(config: ThemeConfig): void {
    const root = document.documentElement;
    const mode = root.getAttribute('data-theme-mode');

    let appearance = '';
    if (mode === 'light') {
        appearance = resolveScheme(config, 'appearance_light');
    } else if (mode === 'dark') {
        appearance = resolveScheme(config, 'appearance_dark');
    }

    syncAttr(root, 'data-whisper-appearance', appearance);
    syncAttr(root, 'data-whisper-text', resolveScheme(config, 'text'));
}

/**
 * 配色方案：从 ThemeConfig 读取方案名，写入 html 的 data-whisper-appearance / data-whisper-text 供 SCSS 消费。
 *
 * 须在 ThemeConfig.init() 完成之后执行。
 * 明亮 / 暗黑切换会重载主题，届时 init() 会重新同步，无需监听 data-theme-mode。
 */
export class SchemeManager implements ThemeModule {
    private readonly onSchemeConfigChanged: () => void;

    constructor(private readonly themeConfig: ThemeConfig) {
        this.onSchemeConfigChanged = () => applySchemeAttributes(themeConfig);
    }

    init(): void {
        applySchemeAttributes(this.themeConfig);
        for (const key of SCHEME_KEYS) {
            this.themeConfig.onConfigChanged(key, this.onSchemeConfigChanged);
        }
    }

    destroy(): void {
        for (const key of SCHEME_KEYS) {
            this.themeConfig.offConfigChanged(key, this.onSchemeConfigChanged);
        }
        document.documentElement.removeAttribute('data-whisper-appearance');
        document.documentElement.removeAttribute('data-whisper-text');
    }
}
