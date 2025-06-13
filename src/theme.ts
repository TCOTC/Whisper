import { DeviceDetector } from './modules/deviceDetector';
import { BlockFocusHandler } from './modules/blockFocusHandler';
import { ElementStatusObserver } from './modules/elementStatusObserver';
import { TooltipHandler } from './modules/tooltipHandler';
import { MenuHandler } from './modules/menuHandler';
import { DialogHandler } from './modules/dialogHandler';
import { MobileAIConfig } from './modules/mobileAIConfig';
import { EventBusManager } from './modules/eventBusManager';
import { overrideConsole, restoreConsole } from './modules/logger';

/**
 * Whisper主题初始化函数
 */
(() => {
    // 覆盖全局console对象，添加前缀
    overrideConsole('Whisper');
    
    console.log('loaded');

    // 初始化设备检测
    const deviceDetector = new DeviceDetector();
    deviceDetector.init();

    // 初始化块焦点处理
    const blockFocusHandler = new BlockFocusHandler();
    blockFocusHandler.init();

    // 初始化元素状态观察器
    const elementStatusObserver = new ElementStatusObserver();
    elementStatusObserver.init();

    // 初始化工具提示处理器
    const tooltipHandler = new TooltipHandler();
    tooltipHandler.init();

    // 初始化菜单处理器
    const menuHandler = new MenuHandler();
    menuHandler.init();

    // 初始化对话框处理器
    const dialogHandler = new DialogHandler();
    dialogHandler.init();

    // 初始化移动端 AI 按钮
    const mobileAIConfig = new MobileAIConfig();
    mobileAIConfig.init();

    // 初始化事件总线管理器
    const eventBusManager = new EventBusManager();
    eventBusManager.init();

    // 关闭或卸载主题
    (window as any).destroyTheme = () => {
        deviceDetector.destroy();
        blockFocusHandler.destroy();
        elementStatusObserver.destroy();
        tooltipHandler.destroy();
        menuHandler.destroy();
        dialogHandler.destroy();
        mobileAIConfig.destroy();
        eventBusManager.destroy();

        console.log('unloaded');
        
        // 恢复原始console对象
        restoreConsole();
    };
})(); 