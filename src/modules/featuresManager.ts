import { ThemeModule } from '../types';
import { THEME_CONFIG_FEATURE_MENU_ITEMS, ThemeConfig, ThemeConfigKey } from './themeConfig';
import { syncAttr } from './utils';

const FEATURE_KEYS = THEME_CONFIG_FEATURE_MENU_ITEMS.map((item) => item.key) as readonly ThemeConfigKey[];
type FeatureKey = (typeof FEATURE_KEYS)[number];

/** 特性键 → html 属性名，例如 text_half_bg → data-whisper-text-half-bg */
function featureAttrName(key: FeatureKey): string {
    return `data-whisper-${key.replace(/_/g, '-')}`;
}

function applyFeatureAttributes(config: ThemeConfig): void {
    const root = document.documentElement;

    for (const key of FEATURE_KEYS) {
        syncAttr(root, featureAttrName(key), config.get(key) ? 'true' : '');
    }
}

/**
 * 样式特性：从 ThemeConfig 读取顶层布尔开关，写入 html 的 data-whisper-* 属性供 SCSS 消费。
 *
 * 须在 ThemeConfig.init() 完成之后执行。
 */
export class FeaturesManager implements ThemeModule {
    private readonly onFeatureConfigChanged: () => void;

    constructor(private readonly themeConfig: ThemeConfig) {
        this.onFeatureConfigChanged = () => applyFeatureAttributes(themeConfig);
    }

    init(): void {
        applyFeatureAttributes(this.themeConfig);
        for (const key of FEATURE_KEYS) {
            this.themeConfig.onConfigChanged(key, this.onFeatureConfigChanged);
        }
    }

    destroy(): void {
        for (const key of FEATURE_KEYS) {
            this.themeConfig.offConfigChanged(key, this.onFeatureConfigChanged);
            document.documentElement.removeAttribute(featureAttrName(key));
        }
    }
}
