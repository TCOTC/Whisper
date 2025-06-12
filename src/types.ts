// 全局类型扩展
declare global {
    interface Window {
        siyuan?: {
            mobile?: boolean;
            config?: {
                appearance?: {
                    mode?: number;
                    themeLight?: string;
                    themeDark?: string;
                };
                readonly?: boolean;
            };
            languages?: {
                themeLight?: string;
                themeDark?: string;
                themeOS?: string;
            };
            ws?: {
                app?: {
                    plugins?: any[];
                    appId?: string;
                };
            };
        };
        destroyTheme?: () => void;
    }
}

// 状态观察器的目标配置
export interface TargetConfig {
    selector: string;
    checks: CheckConfig[];
    found: boolean;
    timedOut: boolean;
    element: HTMLElement | null;
}

// 检查配置
export interface CheckConfig {
    datasetProp: string;
    attributeFilter: string;
    check: (el: HTMLElement) => boolean;
    stateMap: { [key: string]: string };
}

// 事件处理器接口
export interface ThemeModule {
    init: () => void;
    destroy: () => void;
}

// 空出口，让这个文件被视为模块
export {}; 