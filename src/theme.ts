// 导入样式文件以能够在开发时自动编译，但 Vite 不支持为 SCSS 文件生成 Source Map。这里导入是为了让 Vite 在开发时自动编译样式文件
import '../styles/theme.scss';

// import { DeviceDetector } from './modules/deviceDetector';
import { BlockFocusHandler } from './modules/blockFocusHandler';
import { ElementStatusObserver } from './modules/elementStatusObserver';
import { TooltipHandler } from './modules/tooltipHandler';
import { MenuHandler } from './modules/menuHandler';
import { DialogHandler } from './modules/dialogHandler';
import { MobileFunctionality } from './modules/MobileFunctionality';
import { EventBusManager } from './modules/eventBusManager';
import { GoogleAnalytics } from './modules/googleAnalytics';
import { logging } from './modules/logger';
import { isIPad, isMobile, isPublish, isTouchDevice } from './modules/utils';
import { showMessage } from './modules/message';
import { LocalConfig } from './modules/localConfig';

/**
 * 模块接口，定义所有模块必须实现的方法
 */
interface Module {
    init?: () => void;
    destroy?: () => void | Promise<void>;
}

/**
 * 模块管理器，统一处理模块的初始化和销毁
 */
class ModuleManager {
    private modules: Module[] = [];

    /**
     * 注册模块
     * @param instance 模块实例
     */
    register(instance: Module): void {
        this.modules.push(instance);
    }

    /**
     * 初始化所有模块
     */
    initAll(): void {
        this.modules.forEach(instance => {
            if (typeof instance.init === 'function') {
                instance.init();
            }
        });
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
 * 初始化全局对象
 */
function initGlobalVariables(): void {
    window.siyuan.whisper ??= {} as any;
    window.siyuan.whisper.debug ??= {} as any;
    window.siyuan.whisper.theme ??= {} as any;
    window.siyuan.whisper.theme.googleAnalytics ??= {} as any;
    window.siyuan.whisper.loaded = true;
}

/**
 * Whisper 主题初始化函数
 */
(() => {
    initGlobalVariables();
    /**
     * 调试用代码
     * 在 JS 片段中添加 `setTimeout(() => {window.siyuan.whisper.debug.showMessage = true;}, 2500);` 以启用调试消息
     * // TODO功能 主题菜单增加一个配置项，用于控制是否启用调试消息，不使用 window.siyuan.whisper.debug
     */
    function debug(): void {
        if (isMobile()) message('isMobile');
        if (isIPad()) message('isIPad');
        if (isTouchDevice()) message('isTouchDevice');
    }
    function message(text: string): void {
        showMessage(text, 10000, 'info');
    }
    setTimeout(() => {
        if (window.siyuan.whisper.debug?.showMessage) debug();
    }, 5000);
    
    logging.log('Loaded');

    // 创建模块管理器
    const moduleManager = new ModuleManager();
    
    // 注册所有模块
    // moduleManager.register(new ThemeConfigHandler());     // TODO功能 主题配置菜单（发布模式下只读取配置，不写入，也不添加配置菜单）（移动设备和非移动设备的配置菜单要做在不同的地方），要先加载完配置再初始化其他模块
    // moduleManager.register(new DeviceDetector());         // 设备检测：添加设备类型标识（目前 CSS 中已经不需要使用，暂时注释）
    moduleManager.register(new BlockFocusHandler());         // 块焦点处理：给焦点所在块添加属性 data-whisper-block-focus
    moduleManager.register(new EventBusManager());           // 事件总线管理：聚焦折叠的列表项时自动展开

    if (!isPublish()) {
        // 非发布模式
        moduleManager.register(new GoogleAnalytics());       // Google 分析：发送统计信息
        // TODO功能 在主题配置菜单中添加选项、在主题 README 中披露信息收集（主题首次安装的一天内不会发送数据）
    }

    if (!isMobile()) {
        // 非移动端
        moduleManager.register(new TooltipHandler());        // 悬浮提示处理：鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加特定属性
        moduleManager.register(new ElementStatusObserver()); // 元素状态观察：监听元素状态，通过给 html 添加属性来代替使用 :has 选择器
        moduleManager.register(new DialogHandler());         // 对话框处理：为搜索对话框(Dialog)添加 resize__move 类
        moduleManager.register(new MenuHandler());           // 菜单处理：外观模式菜单、页签菜单
    } else {
        // 移动端
        moduleManager.register(new MobileFunctionality());   // 移动端 AI 按钮
    }
    
    // 初始化所有模块
    moduleManager.initAll();

    // 关闭或卸载主题
    window.destroyTheme = async () => {
        await moduleManager.destroyAll();
        window.siyuan.whisper.loaded = false;
        logging.log('Unloaded');

        if (!isPublish()) {
            void removeConfigFile(); // 卸载主题时删除配置文件，异步执行，不能 await
            // TODO功能 如果之后支持同步主题配置，还需要删除放在 data 目录下的配置文件
        }
    };
})();

async function removeConfigFile(): Promise<void> {
    // 卸载主题需要先切换到其他主题，所以需要等一分钟再判断
    await new Promise(resolve => setTimeout(resolve, 60000));
    if (window.siyuan.whisper.loaded) return;

    // 遍历 window.siyuan.config.appearance.lightThemes[N].name 和 window.siyuan.config.appearance.darkThemes[N].name，如果没有 Whisper 则删除配置文件
    const lightThemes = window.siyuan.config?.appearance?.lightThemes;
    const darkThemes = window.siyuan.config?.appearance?.darkThemes;
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
        // 删除配置文件
        try {
            const localConfig = new LocalConfig();
            const success = await localConfig.deleteConfigFile({
                retryOnConnectivityError: true,
                retryInterval: 3000,
                maxRetries: 5
            });
            
            if (success) {
                logging.log('Uninstall. Theme config file removed successfully');
            } else {
                logging.error('Uninstall. Failed to remove theme config file');
            }
        } catch (error) {
            logging.error(`Uninstall. Error removing theme config file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}