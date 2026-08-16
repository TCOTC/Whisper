import { IEventBusMap } from 'siyuan';
import { ThemeModule } from '../types';
import { EventBusManager } from './eventBusManager';
import { themeSwitchFromMenu } from './themeSwitch';
import { isTouchDevice } from './utils';

/**
 * 菜单处理：通过事件总线 common-menu-open / common-menu-closed
 * https://github.com/TCOTC/Whisper/issues/16
 * https://github.com/siyuan-note/siyuan/issues/16171
 */
export class MenuHandler implements ThemeModule {
    private commonMenu: HTMLElement | null = null;

    constructor(private readonly eventBusManager: EventBusManager) {}

    public init(): void {
        this.eventBusManager.on('common-menu-open', this.onCommonMenuOpen);
        this.eventBusManager.on('common-menu-closed', this.onCommonMenuClosed);
    }

    public destroy(): void {
        this.eventBusManager.off('common-menu-open', this.onCommonMenuOpen);
        this.eventBusManager.off('common-menu-closed', this.onCommonMenuClosed);
        this.unbindMenuListeners();
        this.commonMenu = null;
    }

    private unbindMenuListeners(): void {
        if (!this.commonMenu) {
            return;
        }
        this.commonMenu.removeEventListener('click', this.handleMenuClick, true);
        this.commonMenu.removeEventListener('click', this.handleCloseClick, true);
    }

    private onCommonMenuOpen = (event: CustomEvent<IEventBusMap['common-menu-open']>): void => {
        const { menu, name } = event.detail ?? {};
        if (!(menu instanceof HTMLElement)) {
            return;
        }

        this.unbindMenuListeners();
        this.commonMenu = menu;

        // 外观模式菜单
        if (name === 'barmode') {
            menu.addEventListener('click', this.handleMenuClick, true);
            return;
        }

        // 页签菜单
        if (name === 'tab') {
            this.handleTabClose();
        }
    };

    private onCommonMenuClosed = (event: CustomEvent<IEventBusMap['common-menu-closed']>): void => {
        const { menu } = event.detail ?? {};
        if (menu instanceof HTMLElement) {
            this.commonMenu = menu;
        }
        this.unbindMenuListeners();
    };

    private handleMenuClick = (event: MouseEvent): void => {
        const target = event.target as Element;
        const commonMenuType = target.closest('#commonMenu')?.getAttribute('data-name') || '';
        switch (commonMenuType) {
            case 'barmode':
                themeSwitchFromMenu(event);
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
