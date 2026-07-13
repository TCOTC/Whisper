import '../styles/theme.scss';

import { SchemeManager } from './modules/schemeManager';
import { FeaturesManager } from './modules/featuresManager';
import { ThemeConfig } from './modules/themeConfig';
import { DesktopConfigMenu } from './modules/desktopConfigMenu';
import { MobileConfigMenu } from './modules/mobileConfigMenu';
import { DebugHandler } from './modules/debugHandler';
import { DeviceDetector } from './modules/deviceDetector';
import { BlockFocusHandler } from './modules/blockFocusHandler';
import { FileTreeClickHandler } from './modules/fileTreeClickHandler';
import { ElementStatusObserver } from './modules/elementStatusObserver';
import { TooltipHandler } from './modules/tooltipHandler';
import { MenuHandler } from './modules/menuHandler';
import { DialogHandler } from './modules/dialogHandler';
import { EventBusManager } from './modules/eventBusManager';
import { GoogleAnalytics } from './modules/googleAnalytics';
import { logging } from './modules/logger';
import { isMobile, isReadOnly } from './modules/utils';
import { ThemeModule } from './types';

/**
 * 模块管理器，统一处理模块的初始化和销毁
 */
class ModuleManager {
    private modules: ThemeModule[] = [];

    /**
     * 注册模块
     * @param instance 模块实例
     */
    register(instance: ThemeModule): void {
        this.modules.push(instance);
    }

    /**
     * 按注册顺序初始化所有模块，遇异步 init 会依次 await
     */
    async initAll(): Promise<void> {
        for (const instance of this.modules) {
            if (typeof instance.init === 'function') {
                const result = instance.init();
                if (result instanceof Promise) {
                    await result;
                }
            }
        }
    }

    /**
     * 销毁所有模块
     */
    async destroyAll(): Promise<void> {
        // 反向遍历销毁模块，确保按照依赖关系正确销毁
        for (let i = this.modules.length - 1; i >= 0; i--) {
            const instance = this.modules[i];
            if (typeof instance.destroy === 'function') {
                // 异步销毁
                const result = instance.destroy();
                if (result instanceof Promise) {
                    await result;
                }
            }
        }
        this.modules = [];
    }
}

/**
 * Whisper 主题初始化函数
 */
(async () => {
    // 初始化全局对象（始终保留，因为有的代码在主题关闭之后仍然需要访问全局对象）
    window.whisper ??= {} as any;
    window.whisper.enabled = true; // 标记主题已启用，避免主题卸载

    logging.log('Loaded');

    const themeConfig = ThemeConfig.getInstance();
    const mobile = isMobile();
    const readOnly = isReadOnly();
    
    // 创建模块管理器
    const moduleManager = new ModuleManager();

    // 注册所有模块（ThemeConfig 须排首位，init 时加载配置）
    moduleManager.register(themeConfig);
    moduleManager.register(new SchemeManager(themeConfig));   // 配色方案：data-whisper-appearance / data-whisper-text
    moduleManager.register(new FeaturesManager(themeConfig)); // 样式特性：data-whisper-* 布尔开关
    moduleManager.register(new DebugHandler());               // 调试信息：按配置显示设备类型等消息
    moduleManager.register(new DeviceDetector());             // 设备检测：添加设备类型标识，用于 CSS 选择器（避免使用 :has() 选择器导致性能问题）
    moduleManager.register(new BlockFocusHandler());          // 块焦点处理：给焦点所在块添加属性 data-whisper-block-focus
    moduleManager.register(new EventBusManager());            // 事件总线管理：聚焦折叠的列表项时自动展开

    if (!readOnly) {
        // 非发布模式
        if (mobile) {
            // 移动端
            moduleManager.register(new MobileConfigMenu(themeConfig));  // 移动端配置菜单
        } else {
            moduleManager.register(new DesktopConfigMenu(themeConfig)); // 桌面端配置菜单
        }
        moduleManager.register(new GoogleAnalytics());                  // Google 分析：发送统计信息
    }

    if (!mobile) {
        // 非移动端
        moduleManager.register(new TooltipHandler());        // 悬浮提示处理：鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加特定属性
        moduleManager.register(new ElementStatusObserver()); // 元素状态观察：监听元素状态，通过给 html 添加属性来代替使用 :has 选择器
        moduleManager.register(new FileTreeClickHandler());  // 文档树点击：点击空白处取消选中文档或笔记本
        moduleManager.register(new DialogHandler());         // 对话框处理：为搜索对话框(Dialog)添加 resize__move 类
        moduleManager.register(new MenuHandler());           // 菜单处理：外观模式菜单、页签菜单
    }
    
    // 初始化所有模块
    await moduleManager.initAll();

    // 删除旧版配置文件
    if (!readOnly) {
        void themeConfig.removeLegacyConfigFile();
    }

    // 关闭或卸载主题
    window.destroyTheme = async () => {
        await moduleManager.destroyAll();
        window.whisper.enabled = false; // 标记主题已关闭，待判断是否卸载
        logging.log('Unloaded');

        if (!readOnly) {
            void removeConfigStorage(themeConfig); // 卸载主题时删除配置，异步执行，不能 await
        }
    };
})();

async function removeConfigStorage(themeConfig: ThemeConfig): Promise<void> {
    // 卸载主题需要先切换到其他主题，所以需要等一分钟再判断
    await new Promise(resolve => setTimeout(resolve, 60000));
    if (window.whisper.enabled) return;

    // 遍历 window.siyuan.config.appearance.lightThemes[N].name 和 window.siyuan.config.appearance.darkThemes[N].name，如果没有 Whisper 则删除配置
    const lightThemes = window.siyuan.config?.appearance?.lightThemes;
    const darkThemes = window.siyuan.config?.appearance?.darkThemes;
    // 正常情况下至少包含默认主题，不会为空
    if (!lightThemes || !darkThemes) return;
    let needRemove = true;
    lightThemes.forEach((theme: any) => {
        if (theme.name === 'Whisper') {
            needRemove = false;
        }
    });
    darkThemes.forEach((theme: any) => {
        if (theme.name === 'Whisper') {
            needRemove = false;
        }
    });
    if (needRemove) {
        const success = await themeConfig.deleteConfig();
        if (success) {
            logging.log('Uninstall. Theme config removed successfully');
        } else {
            logging.error('Uninstall. Failed to remove theme config');
        }
    }
}