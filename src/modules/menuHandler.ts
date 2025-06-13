import { ThemeModule } from '../types';
import { ThemeSwitchAnimation } from './themeSwitchAnimation';

export class MenuHandler implements ThemeModule {
    private commonMenuObserver: MutationObserver | null = null;
    private commonMenu: HTMLElement | null = null;
    private whisperCommonMenu: HTMLElement | null = null;
    private commonMenuType: string | null = null;
    private themeSwitchAnimation: ThemeSwitchAnimation;

    constructor() {
        this.themeSwitchAnimation = new ThemeSwitchAnimation();
    }

    /**
     * 初始化菜单处理器
     */
    public init(): void {
        this.setupMenuObserver();
    }

    /**
     * 销毁菜单处理器
     */
    public destroy(): void {
        if (this.commonMenuObserver) {
            this.commonMenuObserver.disconnect();
            this.commonMenuObserver = null;
        }
        
        if (this.commonMenu) {
            this.commonMenu.removeEventListener('click', this.handleMenuClick, true);
            this.commonMenu = null;
        }
        
        if (this.whisperCommonMenu) {
            this.whisperCommonMenu.remove();
            this.whisperCommonMenu = null;
        }
    }

    /**
     * 设置菜单观察器
     */
    private setupMenuObserver(): void {
        this.commonMenu = document.getElementById("commonMenu");
        if (!this.commonMenu) {
            console.error("commonMenu element does not exist.");
            return;
        }
        
        this.commonMenu.insertAdjacentHTML('beforebegin', '<div id="whisperCommonMenu"></div>');
        this.whisperCommonMenu = document.getElementById("whisperCommonMenu");
        
        this.commonMenuObserver = new MutationObserver((mutations) => {
            // 使用一个标志位来确保只处理一次
            let processed = false;

            mutations.forEach(() => {
                if (processed) return; // 如果已经处理过，直接返回

                // 先卸载监听再添加，避免重复添加
                if (this.commonMenu) {
                    this.commonMenu.removeEventListener('click', this.handleMenuClick, true);
                }
                
                if (this.whisperCommonMenu) {
                    this.whisperCommonMenu.dataset.name = "";
                }

                if (this.commonMenu?.getAttribute("data-name") === "barmode") {
                    this.commonMenuType = "barmode";
                    this.commonMenu.addEventListener('click', this.handleMenuClick, true);
                } else if ( // TODO功能 需要给原生 PR 一个菜单的 data-name="tab-header" 属性来简化判断逻辑
                    this.commonMenu?.querySelector('[data-id="close"]') &&
                    this.commonMenu?.querySelector('[data-id="split"]') &&
                    this.commonMenu?.querySelector('[data-id="copy"]') &&
                    this.commonMenu?.querySelector('[data-id="tabToWindow"]')
                ) {
                    if (this.whisperCommonMenu) {
                        this.whisperCommonMenu.dataset.name = "tab-header";
                    }
                    this.handleTabClose();
                }

                processed = true; // 标记为已处理
            });
        });

        // 监听菜单的属性变化
        this.commonMenuObserver.observe(this.commonMenu, { attributes: true });
    }

    /**
     * 处理菜单点击事件
     */
    private handleMenuClick = (e: MouseEvent): void => {
        switch (this.commonMenuType) {
            case "barmode":
                this.themeSwitchAnimation.execute(e);
                break;
        }
    };

    /**
     * 处理页签关闭菜单
     */
    private handleTabClose(): void {
        if (!this.commonMenu) return;
        
        const closeMenu = this.commonMenu.querySelector('[data-id="close"]');
        if (!closeMenu) return;

        const clonedCloseMenu = closeMenu.cloneNode(true) as HTMLElement;
        clonedCloseMenu.querySelector('.b3-menu__icon')?.remove(); // 克隆选项移除图标

        closeMenu.querySelector('.b3-menu__accelerator')?.remove(); // 选项移除快捷键
        // 添加图标和子菜单容器
        closeMenu.insertAdjacentHTML('beforeend', `<svg class="b3-menu__icon b3-menu__icon--small"><use xlink:href="#iconRight"></use></svg><div class="b3-menu__submenu"><div class="b3-menu__items"></div></div>`);
        const submenuItems = closeMenu.querySelector('.b3-menu__items');
        if (!submenuItems) return;

        // 克隆选项添加到子菜单中
        submenuItems.appendChild(clonedCloseMenu);

        // 移动其他关闭选项到子菜单中
        this.commonMenu.querySelectorAll('[data-id="closeOthers"], [data-id="closeAll"], [data-id="closeUnmodified"], [data-id="closeLeft"], [data-id="closeRight"]').forEach(element => {
            element.querySelector('.b3-menu__icon')?.remove(); // 移除空图标
            submenuItems.appendChild(element); // 移动元素到子菜单
        });

        // 给分屏选项添加图标
        const splitMenu = this.commonMenu.querySelector('[data-id="split"] > .b3-menu__icon > use');
        if (splitMenu) {
            splitMenu.setAttribute("xlink:href", "#iconSplitLR");
        }
    }
} 