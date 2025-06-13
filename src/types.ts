// 全局类型扩展
declare global {
    interface Window {
        siyuan?: {
            version?: string;
            mobile?: boolean;
            isPublish?: boolean;
            config?: {
                system?: {
                    container?: string;
                    os?: string;
                    osPlatform?: string;
                    disableGoogleAnalytics?: boolean;
                };
                sync?: {
                    enabled?: boolean;
                    provider?: string;
                };
                stat?: {
                    cTreeCount?: number;
                    cBlockCount?: number;
                    cDataSize?: number;
                    cAssetsSize?: number;
                };
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
                    plugins?: SiYuanPlugin[];
                    appId?: string;
                };
            };
            user?: {
                userId?: string;
                userName?: string;
                userSiYuanSubscriptionStatus?: string;
                userSiYuanSubscriptionPlan?: string;
                userSiYuanSubscriptionType?: string;
                userSiYuanOneTimePayStatus?: string;
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
}

// 检查配置
interface CheckConfig {
    datasetProp: string;
    attributeFilter: string;
    check: (el: HTMLElement) => boolean;
    stateMap: { [key: string]: string };
}

// 事件处理器接口
interface ThemeModule {
    init: () => void;
    destroy: () => void;
}

// 导出这些接口以便在需要时显式导入
export { TargetConfig, CheckConfig, ThemeModule, SiYuanPlugin };
