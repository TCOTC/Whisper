import { LocalConfig } from './localConfig';
import { logging } from './logger';
import { getFile } from './api';

const GA_TIMESTAMP_KEY = 'theme.googleAnalytics.lastSentTimestamp';
const CHECK_INTERVAL = 60000; // 原始检查间隔：30分钟（1000 * 60 * 30）
const SEND_INTERVAL = 1800000; // 发送间隔：30分钟

// 扩展 Window 接口以包含 Google Analytics 相关属性
declare global {
    interface Window {
        dataLayer: unknown[] | undefined;
        whisper_theme_gtag: ((...args: unknown[]) => void) | undefined;
    }
}

/**
 * Google Analytics 模块：发送统计信息
 */
export class GoogleAnalytics {
    private scriptId = 'whisper-theme-analytics';
    private gaId = 'G-ZY75BR723S';
    private themeVersion = window.siyuan.config?.appearance?.themeVer;
    private lastSentTimestamp = 0;
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
        // 等待 5 秒，确保配置加载完成
        await new Promise(resolve => setTimeout(resolve, 5000));
        // 检查用户是否禁用了 Google Analytics
        if (
            window.siyuan.config?.system?.disableGoogleAnalytics || // 思源 v3.2.0 之前的 Google Analytics 选项，如果禁用了的话这个工作空间就会一直禁用下去
            window.siyuan.whisper.theme.googleAnalytics.disableGoogleAnalytics // TODO功能 支持配置，安装主题之后的默认配置 = window.siyuan.config?.system?.disableGoogleAnalytics ?? true
        ) {
            return;
        }
        // 主题初始化时先发送一次数据
        await this.checkAndSend();
        // 设置定时检查，每 30 分钟检查一次是否需要发送数据
        this.checkIntervalId = window.setInterval(() => {
            this.checkAndSend().catch(err => {
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
     * 检查时间并发送数据
     */
    private async checkAndSend() {
        const currentTimestamp = Date.now();
        
        // 获取今天的日期，格式为 YYYY-MM-DD
        this.dateISO = new Date().toISOString().split('T')[0];
        
        // 获取最后发送时间戳
        const localConfig = new LocalConfig();
        await localConfig.init();
        const lastSentTimestamp = await localConfig.get<number>(GA_TIMESTAMP_KEY, 0, {
            retryOnConnectivityError: true,
            retryInterval: 20000, // 20秒
            maxRetries: 60 // 60次
        });
        
        // 如果距离上次发送时间不足 30 分钟，则不再发送
        if (lastSentTimestamp !== undefined && currentTimestamp - lastSentTimestamp < SEND_INTERVAL) {
            return;
        }
        
        // 更新本地存储的时间戳
        this.lastSentTimestamp = currentTimestamp;
        await localConfig.set(GA_TIMESTAMP_KEY, this.lastSentTimestamp);
        
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
            // @ts-ignore
            function gtag(..._args: unknown[]) {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push(arguments);
            }
            window.whisper_theme_gtag = gtag;

            gtag('js', new Date());
            gtag('config', this.gaId, {
                'send_page_view': false,               // 阻止 GA4 自动发送 page_view event
                'user_id': window.siyuan.user?.userId, // 已登录用户的 User-ID：用于将统计信息与实际的单个用户关联以避免重复统计 https://developers.google.com/analytics/devguides/collection/ga4/user-id?client_type=gtag
            });
        }

        logging.log('Sending Google Analytics data. https://github.com/TCOTC/Whisper/issues/11'); // TODO功能 修改输出日志为“Whisper 主题正在发送 Google Analytics 数据（在外观模式菜单中可以禁用）”

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
            theme_version: this.themeVersion,  // 主题版本：用于统计一个时间段内的主题版本使用情况
            date_iso: this.dateISO,            // ISO日期：用于统计单日活跃用户数
            timestamp: this.lastSentTimestamp, // 最后发送时间戳
            language: navigator.language,
        };

        try {
            // 添加思源笔记相关信息（如果可用）
            const siyuan = window.siyuan;
            if (siyuan) {
                if (siyuan.config?.lang) {
                    params.app_language = siyuan.config.lang; // 界面语言：用于统计主题在不同语言中的使用情况
                }

                // 系统信息
                if (siyuan.config?.system) {
                    params.app_version = siyuan.config.system.kernelVersion; // 思源笔记版本：用于统计主题在不同思源笔记版本上的使用情况
                    params.app_container = siyuan.config.system.container;   // 运行环境：　　用于统计主题在 桌面端、移动端、Docker 上的使用情况
                    params.app_os = siyuan.config.system.os;                 // 操作系统类型：用于统计主题在 Windows、MacOS、Linux、Android、iOS 上的使用情况
                    params.app_platform = siyuan.config.system.osPlatform;   // 操作系统名称：用于统计主题在操作系统不同版本上的使用情况，包含操作系统版本号、WebView 版本号
                }

                // 订阅信息
                // if (siyuan.user) {
                //     params.is_logged_in = true;
                //     params.subscription_status = siyuan.user.userSiYuanSubscriptionStatus;
                //     params.subscription_plan = siyuan.user.userSiYuanSubscriptionPlan;
                //     params.subscription_type = siyuan.user.userSiYuanSubscriptionType;
                //     params.one_time_pay_status = siyuan.user.userSiYuanOneTimePayStatus;
                // } else {
                //     params.is_logged_in = false;
                // }

                // 同步信息
                if (siyuan.config?.sync) {
                    params.sync_enabled = siyuan.config.sync.enabled; // 同步状态：用于统计主题所在设备是否开启了同步，为之后考虑是否实现主题配置同步提供参考
                    // params.sync_provider = siyuan.config.sync.provider; // 同步方式：用于统计主题在不同同步方式上的使用情况，为之后考虑是否实现主题配置同步提供参考
                }

                // 使用量信息：用于统计主题的受众范围
                if (siyuan.config?.stat) {
                    params.user_create_time = siyuan.user?.userCreateTime?.slice(0, 6); // 账号创建时间（截取年月）
                    params.tree_count = siyuan.config.stat.cTreeCount;                  // 文档数量
                    params.block_count = siyuan.config.stat.cBlockCount;                // 内容块数量
                    // params.data_size = siyuan.config.stat.cDataSize;
                    // params.assets_size = siyuan.config.stat.cAssetsSize;
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

    /**
     * 跟踪功能使用（预留用来统计配色方案使用情况）
     * @param featureName 功能名称
     * @param params 附加参数
     */
    trackFeatureUse(featureName: string, params: Record<string, unknown> = {}) {
        this.trackEvent('feature_use', { feature_name: featureName, ...params });
    }
}

// 思源 v3.2.0 以前的原生功能作为参考：
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