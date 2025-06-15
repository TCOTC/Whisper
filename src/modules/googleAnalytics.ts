import { LocalConfig } from './localConfig';
import { logging } from './logger';
import { getFile } from './utils';

const GA_DATE_ISO_KEY = 'theme.googleAnalytics.dateISO';
const CHECK_INTERVAL = 3600000; // 检查间隔：1小时（1000 * 60 * 60）

// 扩展 Window 接口以包含 Google Analytics 相关属性
declare global {
    interface Window {
        dataLayer: unknown[] | undefined;
        whisper_theme_gtag: ((...args: unknown[]) => void) | undefined;
    }
}

export class GoogleAnalytics {
    private scriptId = 'whisper-theme-analytics';
    private gaId = 'G-ZY75BR723S';
    private themeVersion = window.siyuan?.config?.appearance?.themeVer;
    private dateISO = '';
    private checkIntervalId: number | null = null;
    
    private async fetchThemeVersion() {
        // 备用方案：从 theme.json 获取主题版本号
        try {
            const content = await getFile('/conf/appearance/themes/Whisper/theme.json');
            if (typeof content === 'string') {
                const data = JSON.parse(content);
                this.themeVersion = data.version;
                return;
            }
        } catch {
            logging.error('Failed to get theme version');
        }
        this.themeVersion = 'unknown-version';
    }

    /**
     * 初始化 Google Analytics
     */
    async init() {
        // 检查用户是否禁用了 Google Analytics
        if (window.siyuan?.config?.system?.disableGoogleAnalytics) {
            return;
        }

        await this.checkDate();
        
        // 设置定时检查，确保即使页面长时间不关闭也能每天发送一次数据
        this.checkIntervalId = window.setInterval(() => {
            this.checkDate().catch(err => {
                logging.error('Failed to check and send analytics data:', err);
            });
        }, CHECK_INTERVAL);
    }

    /**
     * 销毁 Google Analytics
     */
    destroy() {
        // 清除定时器
        if (this.checkIntervalId !== null) {
            window.clearInterval(this.checkIntervalId);
            this.checkIntervalId = null;
        }

        // 移除 Google Analytics 脚本
        const script = document.getElementById(this.scriptId);
        if (script) {
            script.remove();
        }

        if (window.whisper_theme_gtag) {
            window.whisper_theme_gtag = undefined;
        }
    }

    /**
     * 检查日期
     */
    private async checkDate() {
        // 获取今天的日期，格式为 YYYY-MM-DD
        const currentDateISO = new Date().toISOString().split('T')[0];
        
        // 获取最后发送日期
        const localConfig = new LocalConfig();
        const lastSentDateISO = await localConfig.get(GA_DATE_ISO_KEY);
        
        // 如果今天已经发送过数据，则不再发送
        if (lastSentDateISO && lastSentDateISO === currentDateISO) {
            return;
        }
        
        // 更新本地存储的日期
        this.dateISO = currentDateISO;
        await localConfig.set(GA_DATE_ISO_KEY, this.dateISO);
        
        // 加载 Google Analytics
        this.initGA();
    }

    /**
     * 加载 Google Analytics
     */
    private initGA() {
        // 检查是否已添加脚本，避免重复插入
        if (!document.getElementById(this.scriptId)) {
            // 创建 <script> 标签
            const script = document.createElement('script');
            script.id = this.scriptId;
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=' + this.gaId;
            document.head.appendChild(script);
        }

        // 初始化 GA 配置（如果尚未初始化）
        if (!window.whisper_theme_gtag) {
            /* eslint-disable prefer-rest-params, @typescript-eslint/no-unused-vars */
            function gtag(..._args: unknown[]) {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(arguments);
            }
            window.whisper_theme_gtag = gtag;

            gtag('js', new Date());
            gtag('config', this.gaId, {
                'send_page_view': false,
                'user_id': window.siyuan?.user?.userId || 'anonymous',
                'user_name': window.siyuan?.user?.userName || 'anonymous'
            });
        }

        // 收集并发送基本信息
        this.sendInfo();
    }

    /**
     * 收集并发送基本信息
     */
    private async sendInfo() {
        if (!this.themeVersion) {
            await this.fetchThemeVersion();
        }

        const params: Record<string, unknown> = {
            theme_version: this.themeVersion,
            screen_width: window.innerWidth,
            screen_height: window.innerHeight,
            pixel_ratio: window.devicePixelRatio,
            language: navigator.language,
            date_iso: this.dateISO,
        };

        try {
            // 添加思源笔记相关信息（如果可用）
            const siyuan = window.siyuan;
            if (siyuan) {
                // 系统信息
                if (siyuan.config?.system) {
                    params.app_version = siyuan.config.system.kernelVersion;
                    params.app_container = siyuan.config.system.container;
                    params.app_os = siyuan.config.system.os;
                    params.app_platform = siyuan.config.system.osPlatform;
                }

                // 用户信息（不包含隐私数据）
                if (siyuan.user) {
                    params.is_logged_in = true;
                    params.subscription_status = siyuan.user.userSiYuanSubscriptionStatus;
                    params.subscription_plan = siyuan.user.userSiYuanSubscriptionPlan;
                    params.subscription_type = siyuan.user.userSiYuanSubscriptionType;
                    params.one_time_pay_status = siyuan.user.userSiYuanOneTimePayStatus;
                } else {
                    params.is_logged_in = false;
                }

                // 同步信息
                if (siyuan.config?.sync) {
                    params.sync_enabled = siyuan.config.sync.enabled;
                    params.sync_provider = siyuan.config.sync.provider;
                }

                // 统计信息
                if (siyuan.config?.stat) {
                    params.tree_count = siyuan.config.stat.cTreeCount;
                    params.block_count = siyuan.config.stat.cBlockCount;
                    params.data_size = siyuan.config.stat.cDataSize;
                    params.assets_size = siyuan.config.stat.cAssetsSize;
                }
            }
        } catch (e) {
            logging.error('Error collecting SiYuan data for analytics:', e);
        }

        // 发送事件
        if (window.whisper_theme_gtag) {
            window.whisper_theme_gtag('event', 'theme_init', params);
        }
    }

    /**
     * 跟踪自定义事件
     * @param eventName 事件名称
     * @param params 事件参数
     */
    trackEvent(eventName: string, params: Record<string, unknown> = {}) {
        if (!window.whisper_theme_gtag) return;
        
        // 添加主题版本信息
        params.theme_version = this.themeVersion;
        
        // 发送事件
        window.whisper_theme_gtag('event', eventName, params);
    }

    // /**
    //  * 跟踪页面访问
    //  * @param pageName 页面名称
    //  */
    // trackPageView(pageName: string) {
    //     this.trackEvent('page_view', { page_name: pageName });
    // }

    /**
     * 跟踪功能使用（预留用来统计配色方案使用情况）
     * @param featureName 功能名称
     * @param params 附加参数
     */
    trackFeatureUse(featureName: string, params: Record<string, unknown> = {}) {
        this.trackEvent('feature_use', { feature_name: featureName, ...params });
    }
}

// 思源原生功能作为参考
// export const addGA = () => {
//     if (!window.siyuan.config.system.disableGoogleAnalytics) {
//         addScript("https://www.googletagmanager.com/gtag/js?id=G-L7WEXVQCR9", "gaScript");
//         window.dataLayer = window.dataLayer || [];
//         /*eslint-disable */
//         const gtag = function (...args: any[]) {
//             window.dataLayer.push(arguments);
//         };
//         /*eslint-enable */
//         gtag("js", new Date());
//         gtag("config", "G-L7WEXVQCR9", {send_page_view: false});
//         const para = {
//             version: Constants.SIYUAN_VERSION,
//             container: window.siyuan.config.system.container,
//             os: window.siyuan.config.system.os,
//             osPlatform: window.siyuan.config.system.osPlatform,
//             isLoggedIn: false,
//             subscriptionStatus: -1,
//             subscriptionPlan: -1,
//             subscriptionType: -1,
//             oneTimePayStatus: -1,
//             syncEnabled: false,
//             syncProvider: -1,
//             cTreeCount: window.siyuan.config.stat.cTreeCount,
//             cBlockCount: window.siyuan.config.stat.cBlockCount,
//             cDataSize: window.siyuan.config.stat.cDataSize,
//             cAssetsSize: window.siyuan.config.stat.cAssetsSize,
//         };
//         if (window.siyuan.user) {
//             para.isLoggedIn = true;
//             para.subscriptionStatus = window.siyuan.user.userSiYuanSubscriptionStatus;
//             para.subscriptionPlan = window.siyuan.user.userSiYuanSubscriptionPlan;
//             para.subscriptionType = window.siyuan.user.userSiYuanSubscriptionType;
//             para.oneTimePayStatus = window.siyuan.user.userSiYuanOneTimePayStatus;
//         }
//         if (window.siyuan.config.sync) {
//             para.syncEnabled = window.siyuan.config.sync.enabled;
//             para.syncProvider = window.siyuan.config.sync.provider;
//         }
//         gtag("event", Constants.ANALYTICS_EVT_ON_GET_CONFIG, para);
//     }
// };