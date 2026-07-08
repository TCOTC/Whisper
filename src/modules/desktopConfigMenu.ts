import { ThemeModule } from '../types';
import {
    flatMapMenuGroups,
    MenuConfigKey,
    MenuItemDef,
    THEME_CONFIG_MENU_GROUPS,
    ThemeConfig,
} from './themeConfig';import { getCommonMenu, subscribeCommonMenu } from './commonMenuObserver';
import { t } from './i18n';
import { logging } from './logger';

function buildMenuSwitchInput(id: string, checked: boolean): string {
    return `<input class="b3-switch b3-switch--menu" id="${id}" type="checkbox"${checked ? ' checked' : ''}>`;
}

function buildDesktopMenuItemHtml({ key, icon }: MenuItemDef, config: ThemeConfig): string {
    return `<label class="b3-menu__item" data-whisper-config-item="${key}">
        <svg class="b3-menu__icon"><use xlink:href="#${icon}"></use></svg>
        <span class="fn__flex-center">${t(key)}</span>
        <span class="fn__space fn__flex-1"></span>
        ${buildMenuSwitchInput(key, config.get(key))}
    </label>`;
}

function buildDesktopMenuHtml(config: ThemeConfig): string {
    const separator = '<div class="b3-menu__separator" data-whisper-config-separator></div>';
    return flatMapMenuGroups(THEME_CONFIG_MENU_GROUPS, {
        leading: () => separator,
        separator: () => separator,
        item: (item) => buildDesktopMenuItemHtml(item, config),
    }).join('');
}

function removeInjectedMenuElements(): void {
    document.querySelectorAll('[data-whisper-config-separator]').forEach((element) => element.remove());
    document.querySelectorAll('[data-whisper-config-item]').forEach((element) => element.remove());
}

/** 桌面端 barmode 配置子菜单 */
export class DesktopConfigMenu implements ThemeModule {
    private unsubscribe: (() => void) | null = null;
    private commonMenu: HTMLElement | null = null;

    constructor(private readonly config: ThemeConfig) {}

    init(): void {
        if (!getCommonMenu()) {
            logging.error('commonMenu element does not exist.');
            return;
        }

        this.unsubscribe = subscribeCommonMenu(this.handleCommonMenuChange);
    }

    destroy(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;

        if (this.commonMenu) {
            this.commonMenu.removeEventListener('change', this.handleSwitchChange, true);
        }

        removeInjectedMenuElements();
        this.commonMenu = null;
    }

    private handleSwitchChange = (event: Event): void => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || !input.classList.contains('b3-switch')) {
            return;
        }

        const key = input.closest('[data-whisper-config-item]')?.getAttribute('data-whisper-config-item');
        if (!key) {
            return;
        }

        this.config.set(key as MenuConfigKey, input.checked);
        event.stopPropagation();
    };

    private handleCommonMenuChange = (menu: HTMLElement, menuName: string | null): void => {
        if (this.commonMenu) {
            this.commonMenu.removeEventListener('change', this.handleSwitchChange, true);
        }

        this.commonMenu = menu;

        if (menuName !== 'barmode') {
            return;
        }

        this.mountMenu();
        menu.addEventListener('change', this.handleSwitchChange, true);
    };

    private mountMenu(): void {
        if (!this.commonMenu || this.commonMenu.querySelector('[data-whisper-config-separator]')) {
            return;
        }

        const menuItems = this.commonMenu.querySelector('.b3-menu__items');
        if (!menuItems) {
            return;
        }

        menuItems.insertAdjacentHTML('beforeend', buildDesktopMenuHtml(this.config));
    }
}
