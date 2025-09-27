import { Plugin as Theme, TEventBus } from "siyuan";
import { ThemeModule } from '../types';

export class EventBusManager implements ThemeModule {
    private themeName: string = "whisper-theme";
    private eventHandlers: Map<TEventBus, (event: CustomEvent) => void> = new Map();

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
        let thisTheme = window.siyuan.ws?.app?.plugins?.find(item => (item as any).name === themeName) as any;
        if (thisTheme) return thisTheme;

        class EventBus implements EventBus {
            private eventTarget: Comment;

            constructor(name: string = "") {
                this.eventTarget = document.createComment(name);
                document.appendChild(this.eventTarget);
            }

            on<K extends TEventBus>(type: K, listener: (event: CustomEvent) => void): void {
                this.eventTarget.addEventListener(type, listener as EventListener);
            }

            once<K extends TEventBus>(type: K, listener: (event: CustomEvent) => void): void {
                this.eventTarget.addEventListener(type, listener as EventListener, { once: true });
            }

            off<K extends TEventBus>(type: K, listener: (event: CustomEvent) => void): void {
                this.eventTarget.removeEventListener(type, listener as EventListener);
            }

            emit<K extends TEventBus>(type: K, detail: any): boolean {
                return this.eventTarget.dispatchEvent(new CustomEvent(type, { detail, cancelable: true }));
            }
        }

        class Theme implements Theme {
            // 有些是必须有的，比如参考原生 afterLoadPlugin 函数 https://github.com/siyuan-note/siyuan/blob/7ded2d40773332bc1abd63fa5322095edd868c52/app/src/plugin/loader.ts#L123
            // 搜一下哪些地方用到了 `plugin.` 就知道了
            // 也可参考 siyuan-ttf-HarmonyOS_Sans_SC-and-Twemoji 的实现

            app: string; // 必要
            i18n: any; // 必要
            displayName: string;
            name: string; // 必要
            eventBus: EventBus; // 后面要用
            protyleSlash: any[] = [];
            // customBlockRenders: Record<string, any> = {};
            topBarIcons: any[] = []; // 必要
            statusBarIcons: any[] = []; // 必要
            commands: any[] = []; // 必要
            models: Record<string, any> = {};
            docks: Record<string, any> = {}; // 必要
            data: Record<string, any> = {};
            // protyleOptionsValue: any = null;
            // setting: any = {};

            constructor(options: { app?: string; i18n?: any; displayName?: string; name: string }) {
                this.app = options.app || window.siyuan.ws?.app?.appId || '';
                this.i18n = options.i18n || null;
                this.displayName = options.displayName || options.name;
                this.name = options.name;
                this.eventBus = new EventBus(options.name);
            }

            onload(): void {}
            onunload(): void {}
            uninstall(): void {}
            async updateCards(options: any): Promise<any> { return options; } // 返回选项本身
            onLayoutReady(): void {} // 必要
            // addCommand(_command: any): void {}
            // addIcons(_svg: string): void {}
            // addTopBar(_options: any): null { return null; } // 模拟返回 null
            // addStatusBar(_options: any): null { return null; } // 模拟返回 null
            // addTopBar(_options: any): HTMLElement { return document.createElement('div'); }
            // addStatusBar(_options: any): HTMLElement { return document.createElement('div'); }
            // openSetting(): void {}
            // // 去掉设置，参考 https://github.com/siyuan-note/siyuan/blob/dae6158860cc704e353454565c96e874278c6f47/app/src/plugin/openTopBarMenu.ts#L25
            // // 不去掉的话会在右上角的插件菜单添加一个选项
            // async loadData(_storageName: string): Promise<any> { return Promise.resolve(null); }
            // async saveData(_storageName: string, _data: any): Promise<void> { return Promise.resolve(); }
            // async removeData(_storageName: string): Promise<void> { return Promise.resolve(); }
            // getOpenedTab(): Record<string, any> { return {}; } // 返回空对象
            // addTab(_options: any): () => any { return () => ({}); } // 返回空函数模拟模型
            // addDock(_options: any): { config: any; model: any } { return { config: {}, model: {} }; } // 返回空对象模拟 dock
            // addFloatLayer(_options: any): void {}
            updateProtyleToolbar(toolbar: any): any { return toolbar; } // 返回 toolbar 本身，否则不显示工具栏 https://github.com/TCOTC/Whisper/issues/8
            // set protyleOptions(_options: any) {}
            // get protyleOptions(): any { return this.protyleOptionsValue; }
        }

        thisTheme = new Theme({ name: themeName }) as any;
        if (window.siyuan.ws?.app?.plugins) {
            window.siyuan.ws.app.plugins.push(thisTheme);
        }
        return thisTheme;
    }

    /**
     * 移除主题对象
     */
    private removeMyTheme(themeName: string = this.themeName): void {
        if (window.siyuan.ws?.app?.plugins) {
            const index = window.siyuan.ws.app.plugins.findIndex(item => (item as any).name === themeName);
            if (index > -1) {
                window.siyuan.ws.app.plugins.splice(index, 1); // 移除插件
            }
        }
    }

    /**
     * 绑定事件监听器
     */
    private eventBusOn(eventName: TEventBus, callback: (event: CustomEvent) => void): void {
        const plugin = this.getThisTheme();
        this.eventHandlers.set(eventName, callback);
        plugin.eventBus.on(eventName, callback);
    }

    /**
     * 解绑事件监听器
     */
    private eventBusOff(eventName: TEventBus, callback: (event: CustomEvent) => void): void {
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