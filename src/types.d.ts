import { ISiyuan } from 'siyuan';

// 全局类型扩展
declare global {
    interface Window {
        whisper: {
            enabled?: boolean; // 主题是否处于启用状态
        };
        siyuan: ISiyuan & {
            user?: {
                userCreateTime?: string;
            };
        };
        destroyTheme?: () => void;
    }
}

// SiYuan 插件接口
interface SiYuanPlugin {
    name: string;
    i18n?: Record<string, string>;
    eventBus?: {
        on: (event: string, callback: (detail: unknown) => void) => void;
        off: (event: string, callback: (detail: unknown) => void) => void;
        emit: (event: string, detail: unknown) => void;
    };
    [key: string]: unknown;
}

// 状态观察器的目标配置
interface TargetConfig {
    selector: string;
    checks: CheckConfig[];
    found: boolean;
    timedOut: boolean;
    element: HTMLElement | null;
    exclude?: {
        /**
         * 排除配置，如果存在符合该选择器的元素，则忽略该目标
         */
        selector: string;
        /**
         * 可选的额外检查函数，如果返回 true，则忽略该目标
         * @param el 元素
         * @returns 是否忽略该目标
         */
        check?: (el: HTMLElement) => boolean;
    };
}

// 检查配置
interface CheckConfig {
    datasetProp: string;
    attributeFilter: string;
    check: (el: HTMLElement) => boolean;
    stateMap: { [key: string]: string };
}

// 主题模块接口
interface ThemeModule {
    init?: () => void | Promise<void>;
    destroy?: () => void | Promise<void>;
}

// 导出这些接口以便在需要时显式导入
export type { TargetConfig, CheckConfig, ThemeModule, SiYuanPlugin };
