import { Plugin as Theme, TEventBus } from 'siyuan';
import { ThemeModule } from '../types';

// 定义基本的插件接口，只包含我们需要的属性
interface BasicPlugin {
    name: string;
    [key: string]: unknown;
}

export class EventBusManager implements ThemeModule {
    private themeName: string = 'whisper-theme';
    private eventHandlers: Map<TEventBus, (event: CustomEvent) => void> = new Map();

    /**
     * 初始化事件总线管理器
     */
    public init(): void {
        // 绑定事件处理器
        this.eventBusOn('loaded-protyle-static', this.eventBusHandler);
    }

    /**
     * 销毁事件总线管理器
     */
    public destroy(): void {
        // 解绑事件处理器
        this.eventBusOff('loaded-protyle-static', this.eventBusHandler);
        this.removeMyTheme();
    }

    /**
     * 获取主题对象
     */
    private getThisTheme(themeName: string = this.themeName): Theme {
        // 使用 unknown 类型转换来避免类型错误
        const thisTheme = window.siyuan?.ws?.app?.plugins?.find(
            item => (item as BasicPlugin).name === themeName
        ) as unknown as Theme;
        
        if (thisTheme) return thisTheme;

        // 创建一个基本的主题对象
        const eventTarget = document.createComment(themeName);
        document.appendChild(eventTarget);
        
        // 创建一个基本对象并转换为 Theme 类型
        const newTheme = {
            name: themeName,
            app: window.siyuan?.ws?.app?.appId || '',
            displayName: themeName,
            i18n: null,
            eventBus: {
                on: (type: string, listener: (event: CustomEvent) => void): void => {
                    eventTarget.addEventListener(type, listener as EventListener);
                },
                once: (type: string, listener: (event: CustomEvent) => void): void => {
                    eventTarget.addEventListener(type, listener as EventListener, { once: true });
                },
                off: (type: string, listener: (event: CustomEvent) => void): void => {
                    eventTarget.removeEventListener(type, listener as EventListener);
                },
                emit: (type: string, detail: unknown): boolean => {
                    return eventTarget.dispatchEvent(new CustomEvent(type, { detail, cancelable: true }));
                }
            },
            protyleSlash: [],
            topBarIcons: [],
            statusBarIcons: [],
            commands: [],
            models: {},
            docks: {},
            data: {},
            onload: () => {},
            onunload: () => {},
            uninstall: () => {},
            updateCards: (options: unknown) => options,
            onLayoutReady: () => {},
            updateProtyleToolbar: (toolbar: unknown) => toolbar
        } as unknown as Theme;
        
        // 由于类型兼容性问题，这里使用 as unknown 进行双重类型转换
        if (window.siyuan?.ws?.app?.plugins) {
            (window.siyuan.ws.app.plugins as unknown[]).push(newTheme);
        }
        return newTheme;
    }

    /**
     * 移除主题对象
     */
    private removeMyTheme(themeName: string = this.themeName): void {
        if (window.siyuan?.ws?.app?.plugins) {
            const index = (window.siyuan.ws.app.plugins as unknown[]).findIndex(
                item => (item as BasicPlugin).name === themeName
            );
            if (index > -1) {
                (window.siyuan.ws.app.plugins as unknown[]).splice(index, 1); // 移除插件
            }
        }
    }

    /**
     * 绑定事件监听器
     */
    private eventBusOn(eventName: TEventBus, callback: (event: CustomEvent) => void): void {
        const plugin = this.getThisTheme();
        this.eventHandlers.set(eventName, callback);
        // 使用类型断言来绕过类型检查
        (plugin.eventBus as unknown as { on: (type: string, listener: (event: CustomEvent) => void) => void })
            .on(eventName, callback);
    }

    /**
     * 解绑事件监听器
     */
    private eventBusOff(eventName: TEventBus, callback: (event: CustomEvent) => void): void {
        const plugin = this.getThisTheme();
        // 使用类型断言来绕过类型检查
        (plugin.eventBus as unknown as { off: (type: string, listener: (event: CustomEvent) => void) => void })
            .off(eventName, callback);
        this.eventHandlers.delete(eventName);
    }

    /**
     * 事件处理器
     */
    private eventBusHandler = (event: CustomEvent): void => {
        if (event.type === 'loaded-protyle-static') {
            // 编辑器加载完成
            const protyle = event.detail.protyle;
            const wysiwyg = protyle?.wysiwyg?.element;
            
            // 功能：聚焦折叠的列表项时自动展开
            // 原理：只使用 CSS 覆盖的话，块标不会改变，因此要用 JS；移除列表项块的 fold="1" 属性之后，编辑内容只影响子块，所以不会保存列表项块的展开状态
            if (wysiwyg?.dataset.docType === 'NodeListItem') {
                // 移除首个块（列表项块）的折叠状态
                const firstListItem = wysiwyg.querySelector(':scope > [data-node-id].li');
                if (firstListItem instanceof HTMLElement) {
                    firstListItem.removeAttribute('fold');
                }
            }
        }
    };
} 