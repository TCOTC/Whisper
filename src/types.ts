// 全局类型扩展
declare global {
    interface Window {
        siyuan?: {
            version?: string;
            mobile?: boolean;
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
                    plugins?: any[];
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
