import { ThemeModule } from '../types';

interface EventBus {
    on: (type: string, listener: (event: CustomEvent) => void) => void;
    once: (type: string, listener: (event: CustomEvent) => void) => void;
    off: (type: string, listener: (event: CustomEvent) => void) => void;
    emit: (type: string, detail: any) => boolean;
}

interface Theme {
    app: string;
    i18n: any;
    displayName: string;
    name: string;
    eventBus: EventBus;
    protyleSlash: any[];
    customBlockRenders: Record<string, any>;
    topBarIcons: any[];
    statusBarIcons: any[];
    commands: any[];
    models: Record<string, any>;
    docks: Record<string, any>;
    data: Record<string, any>;
    protyleOptionsValue: any;
    onload: () => void;
    onunload: () => void;
    uninstall: () => void;
    updateCards: (options: any) => Promise<any>;
    onLayoutReady: () => void;
    addCommand: (command: any) => void;
    addIcons: (svg: string) => void;
    addTopBar: (options: any) => null;
    addStatusBar: (options: any) => null;
    loadData: (storageName: string) => Promise<any>;
    saveData: (storageName: string, data: any) => Promise<void>;
    removeData: (storageName: string) => Promise<void>;
    getOpenedTab: () => Record<string, any>;
    addTab: (options: any) => () => void;
    addDock: (options: any) => Record<string, any>;
    addFloatLayer: (options: any) => void;
    updateProtyleToolbar: (toolbar: any) => any;
}

export class EventBusManager implements ThemeModule {
    private themeName: string = "whisper-theme";
    private eventHandlers: Map<string, (event: CustomEvent) => void> = new Map();

    /**
     * 初始化事件总线管理器
     */
    public init(): void {
        // 绑定事件处理器
        this.eventBusOn("loaded-protyle-static", this.eventBusHandler);
    }

    /**
     * 销毁事件总线管理器
     */
    public destroy(): void {
        // 解绑事件处理器
        this.eventBusOff("loaded-protyle-static", this.eventBusHandler);
        this.removeMyTheme();
    }

    /**
     * 获取主题对象
     */
    private getThisTheme(themeName: string = this.themeName): Theme {
        let thisTheme = window.siyuan?.ws?.app?.plugins?.find(item => (item as any).name === themeName) as any;
        if (thisTheme) return thisTheme as Theme;

        class EventBus implements EventBus {
            private eventTarget: Comment;

            constructor(name: string = "") {
                this.eventTarget = document.createComment(name);
                document.appendChild(this.eventTarget);
            }

            on(type: string, listener: (event: CustomEvent) => void): void {
                this.eventTarget.addEventListener(type, listener as EventListener);
            }

            once(type: string, listener: (event: CustomEvent) => void): void {
                this.eventTarget.addEventListener(type, listener as EventListener, { once: true });
            }

            off(type: string, listener: (event: CustomEvent) => void): void {
                this.eventTarget.removeEventListener(type, listener as EventListener);
            }

            emit(type: string, detail: any): boolean {
                return this.eventTarget.dispatchEvent(new CustomEvent(type, { detail, cancelable: true }));
            }
        }

        class Theme implements Theme {
            app: string;
            i18n: any;
            displayName: string;
            name: string;
            eventBus: EventBus;
            protyleSlash: any[] = [];
            customBlockRenders: Record<string, any> = {};
            topBarIcons: any[] = [];
            statusBarIcons: any[] = [];
            commands: any[] = [];
            models: Record<string, any> = {};
            docks: Record<string, any> = {};
            data: Record<string, any> = {};
            protyleOptionsValue: any = null;

            constructor(options: { app?: string; i18n?: any; displayName?: string; name: string }) {
                this.app = options.app || window.siyuan?.ws?.app?.appId || '';
                this.i18n = options.i18n;
                this.displayName = options.displayName || options.name;
                this.name = options.name;
                this.eventBus = new EventBus(options.name);
            }

            onload(): void {}
            onunload(): void {}
            uninstall(): void {}
            async updateCards(options: any): Promise<any> { return options; } // 返回选项本身
            onLayoutReady(): void {}
            addCommand(_command: any): void {}
            addIcons(_svg: string): void {}
            addTopBar(_options: any): null { return null; } // 模拟返回 null
            addStatusBar(_options: any): null { return null; } // 模拟返回 null
            // openSetting() {}
            // 去掉设置，参考 https://github.com/siyuan-note/siyuan/blob/dae6158860cc704e353454565c96e874278c6f47/app/src/plugin/openTopBarMenu.ts#L25
            // 不去掉的话会在右上角的插件菜单添加一个选项
            async loadData(_storageName: string): Promise<any> { return Promise.resolve(null); }
            async saveData(_storageName: string, _data: any): Promise<void> { return Promise.resolve(); }
            async removeData(_storageName: string): Promise<void> { return Promise.resolve(); }
            getOpenedTab(): Record<string, any> { return {}; } // 返回空对象
            addTab(_options: any): () => void { return () => {}; } // 返回空函数模拟模型
            addDock(_options: any): Record<string, any> { return {}; } // 返回空对象模拟 dock
            addFloatLayer(_options: any): void {}
            updateProtyleToolbar(toolbar: any): any { return toolbar; } // 返回 toolbar 本身，否则不显示工具栏 https://github.com/TCOTC/Whisper/issues/8
            set protyleOptions(_options: any) {}
            get protyleOptions(): any { return this.protyleOptionsValue; }
        }

        thisTheme = new Theme({ name: themeName }) as any;
        if (window.siyuan?.ws?.app?.plugins) {
            window.siyuan.ws.app.plugins.push(thisTheme);
        }
        return thisTheme;
    }

    /**
     * 移除主题对象
     */
    private removeMyTheme(themeName: string = this.themeName): void {
        if (window.siyuan?.ws?.app?.plugins) {
            const index = window.siyuan.ws.app.plugins.findIndex(item => (item as any).name === themeName);
            if (index > -1) {
                window.siyuan.ws.app.plugins.splice(index, 1); // 移除插件
            }
        }
    }

    /**
     * 绑定事件监听器
     */
    private eventBusOn(eventName: string, callback: (event: CustomEvent) => void): void {
        const plugin = this.getThisTheme();
        this.eventHandlers.set(eventName, callback);
        plugin.eventBus.on(eventName, callback);
    }

    /**
     * 解绑事件监听器
     */
    private eventBusOff(eventName: string, callback: (event: CustomEvent) => void): void {
        const plugin = this.getThisTheme();
        plugin.eventBus.off(eventName, callback);
        this.eventHandlers.delete(eventName);
    }

    /**
     * 事件处理器
     */
    private eventBusHandler = (event: CustomEvent): void => {
        if (event.type === "loaded-protyle-static") {
            // 编辑器加载完成
            const protyle = event.detail.protyle;
            const wysiwyg = protyle?.wysiwyg?.element;
            
            // 功能：聚焦折叠的列表项时自动展开
            // 原理：只使用 CSS 覆盖的话，块标不会改变，因此要用 JS；移除列表项块的 fold="1" 属性之后，编辑内容只影响子块，所以不会保存列表项块的展开状态
            if (wysiwyg?.dataset.docType === "NodeListItem") {
                // 移除首个块（列表项块）的折叠状态
                const firstListItem = wysiwyg.querySelector(":scope > [data-node-id].li");
                if (firstListItem instanceof HTMLElement) {
                    firstListItem.removeAttribute("fold");
                }
            }
        }
    };
} 