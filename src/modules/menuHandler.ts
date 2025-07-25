import { ThemeModule } from '../types';
import { themeSwitch } from './themeSwitch';
import { logging } from './logger';
import { isTouchDevice } from './utils';

export class MenuHandler implements ThemeModule {
    private commonMenuObserver: MutationObserver | null = null;
    private commonMenu: HTMLElement | null = null;
    private whisperCommonMenu: HTMLElement | null = null;

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
            this.commonMenu.removeEventListener('click', this.handleCloseClick, true);
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
        this.commonMenu = document.getElementById('commonMenu');
        if (!this.commonMenu) {
            logging.error('commonMenu element does not exist.');
            return;
        }
        
        // 在 #commonMenu 元素前插入 <div id="whisperCommonMenu"></div> 元素，用于 CSS 选择器
        const whisperCommonMenu = document.createElement('div');
        whisperCommonMenu.id = 'whisperCommonMenu';
        this.commonMenu.insertAdjacentElement('beforebegin', whisperCommonMenu);
        this.whisperCommonMenu = whisperCommonMenu;
        
        this.commonMenuObserver = new MutationObserver((mutations) => {
            // 使用一个标志位来确保只处理一次
            let processed = false;

            mutations.forEach(() => {
                if (processed) return; // 如果已经处理过，直接返回

                // 先卸载监听再添加，避免重复添加
                if (this.commonMenu) {
                    this.commonMenu.removeEventListener('click', this.handleMenuClick, true);
                    this.commonMenu.removeEventListener('click', this.handleCloseClick, true);
                }
                
                if (this.whisperCommonMenu) {
                    this.whisperCommonMenu.dataset.name = '';
                }

                if (this.commonMenu?.getAttribute('data-name') === 'barmode') {
                    // 外观模式菜单
                    this.commonMenu.addEventListener('click', this.handleMenuClick, true);
                } else if ( // TODO功能 需要给原生 PR 一个菜单的 data-name="tab-header" 属性来简化判断逻辑，然后提升主题最低版本号
                    this.commonMenu?.querySelector('[data-id="close"]') &&
                    this.commonMenu?.querySelector('[data-id="split"]') &&
                    this.commonMenu?.querySelector('[data-id="copy"]')
                    // && this.commonMenu?.querySelector('[data-id="tabToWindow"]') // 平板上没有“移动到新窗口”选项
                ) {
                    // 页签菜单
                    if (this.whisperCommonMenu) {
                        this.whisperCommonMenu.dataset.name = 'tab-header';
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
    private handleMenuClick = (event: MouseEvent): void => {
        const target = event.target as Element;
        const commonMenuType = target.closest('#commonMenu')?.getAttribute('data-name') || '';
        switch (commonMenuType) {
            case 'barmode':
                themeSwitch('commonMenu', event);
                break;
            default:
                return;
        }
    };

    /**
     * 处理页签菜单关闭选项
     */
    private handleTabClose(): void {
        if (!this.commonMenu) return;
        
        const closeMenu = this.commonMenu.querySelector('[data-id="close"]');
        if (!closeMenu) return;

        // 如果在平板（触屏设备）上执行，需要阻止第一层的关闭选项的点击事件，否则没法点开子菜单
        if (isTouchDevice()) {
            this.commonMenu.addEventListener('click', this.handleCloseClick, true);
        }

        const clonedCloseMenu = closeMenu.cloneNode(true) as HTMLElement;
        clonedCloseMenu.querySelector('.b3-menu__icon')?.remove(); // 克隆选项移除图标

        closeMenu.querySelector('.b3-menu__accelerator')?.remove(); // 选项移除快捷键
        // 添加图标和子菜单容器
        closeMenu.insertAdjacentHTML('beforeend', '<svg class="b3-menu__icon b3-menu__icon--small"><use xlink:href="#iconRight"></use></svg><div class="b3-menu__submenu"><div class="b3-menu__items"></div></div>');
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
            splitMenu.setAttribute('xlink:href', '#iconSplitLR');
        }
    }
    
    private handleCloseClick = (event: Event) => {
        if (event.target instanceof HTMLElement && !event.target.closest('.b3-menu__submenu')) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
} 