import { ThemeModule } from '../types';
import { THEME_CONFIG_SCHEMA, ThemeConfig, ThemeConfigKey } from './themeConfig';
import { logging } from './logger';
import { syncAttr } from './utils';

const SCHEME_KEYS = [
    'appearance_light',
    'appearance_dark',
    'text',
] as const satisfies readonly ThemeConfigKey[];

type SchemeKey = (typeof SCHEME_KEYS)[number];

/** 各配置键对应的合法方案名（空字符串表示原生） */
const VALID_SCHEMES: Record<SchemeKey, readonly string[]> = {
    appearance_light: ['', 'blush'],
    appearance_dark: ['', 'graphite'],
    text: ['', 'seven'],
};

/** 校验方案名；非法时回退默认并写回 ThemeConfig */
function resolveScheme(config: ThemeConfig, key: SchemeKey): string {
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
