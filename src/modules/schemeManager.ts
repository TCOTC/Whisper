import { ThemeModule } from '../types';
import { ThemeConfig, ThemeConfigKey } from './themeConfig';

const SCHEME_KEYS = [
    'appearance_light',
    'appearance_dark',
    'text',
] as const satisfies readonly ThemeConfigKey[];

function syncAttr(element: HTMLElement, name: string, value: string): void {
    const current = element.getAttribute(name) ?? '';
    if (current === value) {
        return;
    }
    if (value) {
        element.setAttribute(name, value);
    } else {
        element.removeAttribute(name);
    }
}

function applySchemeAttributes(config: ThemeConfig): void {
    const root = document.documentElement;
    const mode = root.getAttribute('data-theme-mode');

    let appearance = '';
    if (mode === 'light') {
        appearance = config.get('appearance_light');
    } else if (mode === 'dark') {
        appearance = config.get('appearance_dark');
    }

    syncAttr(root, 'data-whisper-appearance', appearance);
    syncAttr(root, 'data-whisper-text', config.get('text'));
}

/**
 * 配色方案管理：从 ThemeConfig 读取方案名，写入 html 的 data-whisper-* 属性供 SCSS 消费。
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
