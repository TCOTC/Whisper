import { DeviceDetector } from './modules/deviceDetector';
import { BlockFocusHandler } from './modules/blockFocusHandler';
import { ElementStatusObserver } from './modules/elementStatusObserver';
import { TooltipHandler } from './modules/tooltipHandler';
import { MenuHandler } from './modules/menuHandler';
import { DialogHandler } from './modules/dialogHandler';
import { MobileAIConfig } from './modules/mobileAIConfig';
import { EventBusManager } from './modules/eventBusManager';
import { GoogleAnalytics } from './modules/googleAnalytics';
import { overrideConsole, restoreConsole } from './modules/logger';
import { LocalConfig } from './modules/localConfig';

/**
 * 模块管理器，统一处理模块的初始化和销毁
 */
class ModuleManager {
    private modules: any[] = [];

    /**
     * 注册模块
     * @param instance 模块实例
     */
    register(instance: any): void {
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
    // 覆盖全局console对象，添加前缀
    overrideConsole('Whisper');
    
    console.log('loaded');

    // 创建模块管理器
    const moduleManager = new ModuleManager();
    
    // 注册所有模块
    moduleManager.register(new LocalConfig());
    moduleManager.register(new DeviceDetector());
    moduleManager.register(new BlockFocusHandler());
    moduleManager.register(new ElementStatusObserver());
    moduleManager.register(new TooltipHandler());
    moduleManager.register(new MenuHandler());
    moduleManager.register(new DialogHandler());
    moduleManager.register(new MobileAIConfig());
    moduleManager.register(new EventBusManager());
    moduleManager.register(new GoogleAnalytics());
    
    // 初始化所有模块
    moduleManager.initAll();

    // 关闭或卸载主题
    (window as any).destroyTheme = async () => {
        await moduleManager.destroyAll();
        console.log('unloaded');

        // 恢复原始console对象
        restoreConsole();
    };
})(); 