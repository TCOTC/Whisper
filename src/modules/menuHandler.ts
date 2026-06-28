import { ThemeModule } from '../types';
import { getCommonMenu, subscribeCommonMenu } from './commonMenuObserver';
import { themeSwitch } from './themeSwitch';
import { logging } from './logger';
import { isTouchDevice } from './utils';

export class MenuHandler implements ThemeModule {
    private unsubscribe: (() => void) | null = null;
    private commonMenu: HTMLElement | null = null;
    private whisperCommonMenu: HTMLElement | null = null;

    public init(): void {
        const menu = getCommonMenu();
        if (!menu) {
            logging.error('commonMenu element does not exist.');
            return;
        }

        this.commonMenu = menu;

        // 在 #commonMenu 元素前插入 <div id="whisperCommonMenu"></div> 元素，用于 CSS 选择器
        const whisperCommonMenu = document.createElement('div');
        whisperCommonMenu.id = 'whisperCommonMenu';
        menu.insertAdjacentElement('beforebegin', whisperCommonMenu);
        this.whisperCommonMenu = whisperCommonMenu;

        // TODO跟进 试试通过 Add plugin event bus to #commonMenu 来实现更准确的监听 https://github.com/TCOTC/Whisper/issues/16 https://github.com/siyuan-note/siyuan/issues/16171
        this.unsubscribe = subscribeCommonMenu(this.handleCommonMenuChange);
    }

    public destroy(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;

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

    private handleCommonMenuChange = (commonMenu: HTMLElement, menuName: string | null): void => {
        this.commonMenu = commonMenu;
        this.whisperCommonMenu?.removeAttribute('data-name');

        // 先卸载监听再添加，避免重复添加
        commonMenu.removeEventListener('click', this.handleMenuClick, true);
        commonMenu.removeEventListener('click', this.handleCloseClick, true);

        // 外观模式菜单
        if (menuName === 'barmode') {
            commonMenu.addEventListener('click', this.handleMenuClick, true);
            return;
        }

        // 页签菜单
        if (menuName === 'tab') {
            // TODO测试 验证是否在平板上正常工作
            // TODO废弃 以下 2 行代码是兼容 v3.3.6 以前的版本，版本号提升到 v3.3.6 时即可移除，并且需要同步修改对应的使用 [data-name="tab-header"] 的 CSS
            if (this.whisperCommonMenu) {
                this.whisperCommonMenu.dataset.name = 'tab-header';
            }
            this.handleTabClose();
        }
    };

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

    private handleTabClose(): void {
        if (!this.commonMenu) {
            return;
        }

        const closeMenu = this.commonMenu.querySelector('[data-id="close"]');
        if (!closeMenu) {
            return;
        }

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
        if (!submenuItems) {
            return;
        }

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
