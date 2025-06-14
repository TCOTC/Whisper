import { DeviceDetector } from './modules/deviceDetector';
import { BlockFocusHandler } from './modules/blockFocusHandler';
import { ElementStatusObserver } from './modules/elementStatusObserver';
import { TooltipHandler } from './modules/tooltipHandler';
import { MenuHandler } from './modules/menuHandler';
import { DialogHandler } from './modules/dialogHandler';
import { MobileAIConfig } from './modules/mobileAIConfig';
import { EventBusManager } from './modules/eventBusManager';
import { GoogleAnalytics } from './modules/googleAnalytics';
import { logging } from './modules/logger';
import { isIPad, isMobile, isPublish, isTouchDevice } from './modules/utils';
import { showMessage } from './modules/message';

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
                await Promise.resolve(instance.destroy());
            }
        }
        this.modules = [];
    }
}

/**
 * Whisper 主题初始化函数
 */
(() => {
    /**
     * 调试用代码
     * 在 JS 片段中添加 `setTimeout(() => {window.siyuan.whisper.debug.showMessage = true;}, 2500);` 以启用调试消息
     */
    function debug(): void {
        if (isMobile()) message('isMobile');
        if (isIPad()) message('isIPad');
        if (isTouchDevice()) message('isTouchDevice');
    }
    function message(text: string): void {
        showMessage(text, 10000, 'info');
    }
    window.siyuan = window.siyuan || {};
    window.siyuan.whisper = window.siyuan.whisper || {};
    window.siyuan.whisper.debug = window.siyuan.whisper.debug || {};
    setTimeout(() => {
        if (window.siyuan?.whisper?.debug?.showMessage) debug();
    }, 5000);
    
    logging.log('loaded');

    // 创建模块管理器
    const moduleManager = new ModuleManager();
    
    // 注册所有模块
    // TODO功能 主题配置菜单（发布模式下只读取配置，不写入，也不添加配置菜单）（移动设备和非移动设备的配置菜单要做在不同的地方）
    moduleManager.register(new DeviceDetector());            // 设备检测：添加设备类型标识
    moduleManager.register(new BlockFocusHandler());         // 块焦点处理：给焦点所在块添加属性 data-whisper-block-focus
    moduleManager.register(new EventBusManager());           // 事件总线管理：聚焦折叠的列表项时自动展开

    if (!isPublish()) {
        // 非发布模式
        moduleManager.register(new GoogleAnalytics());       // Google 分析：发送用户信息
    }

    if (!isMobile()) {
        // 非移动端
        moduleManager.register(new TooltipHandler());        // 悬浮提示处理：鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加特定属性
        moduleManager.register(new ElementStatusObserver()); // 元素状态观察：监听元素状态，通过给 html 添加属性来代替使用 :has 选择器
        moduleManager.register(new DialogHandler());         // 对话框处理：为搜索对话框(Dialog)添加 resize__move 类
        moduleManager.register(new MenuHandler());           // 菜单处理：外观模式菜单、页签菜单
        // TODO测试 MenuHandler 里的 handleTabClose 无法在平板上执行，有可能是平板属于 mobile，需要调试看看
    } else {
        // 移动端
        moduleManager.register(new MobileAIConfig());        // 移动端 AI 按钮
    }
    
    // 初始化所有模块
    moduleManager.initAll();

    // 关闭或卸载主题
    (window as Window & { destroyTheme?: () => Promise<void> }).destroyTheme = async () => {
        await moduleManager.destroyAll();
        logging.log('unloaded');
    };
})(); 