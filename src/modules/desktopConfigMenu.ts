import { ThemeModule } from '../types';
import {
    BOOLEAN_CONFIG_KEYS,
    BooleanConfigKey,
    ThemeConfig,
    createSwitchChangeHandler,
    getBooleanConfigMenuIcon,
} from './themeConfig';
import { getCommonMenu, subscribeCommonMenu } from './commonMenuObserver';
import { t } from './i18n';
import { logging } from './logger';

function buildMenuSwitchInput(id: string, checked: boolean): string {
    return `<input class="b3-switch b3-switch--menu" id="${id}" type="checkbox"${checked ? ' checked' : ''}>`;
}

function buildDesktopMenuHtml(getChecked: (key: BooleanConfigKey) => boolean): string {
    const items = BOOLEAN_CONFIG_KEYS.map((key) => {
        return `<label class="b3-menu__item" data-whisper-config-item="${key}">
            <svg class="b3-menu__icon"><use xlink:href="#${getBooleanConfigMenuIcon(key)}"></use></svg>
            <span class="fn__flex-center">${t(key)}</span>
            <span class="fn__space fn__flex-1"></span>
            ${buildMenuSwitchInput(key, getChecked(key))}
        </label>`;
    }).join('');

    return `<div class="b3-menu__separator" data-whisper-config-separator></div>${items}`;
}

function removeInjectedMenuElements(): void {
    document.querySelectorAll('[data-whisper-config-separator]').forEach((element) => element.remove());
    document.querySelectorAll('[data-whisper-config-item]').forEach((element) => element.remove());
}

/** 桌面端 barmode 配置子菜单 */
export class DesktopConfigMenu implements ThemeModule {
    private unsubscribe: (() => void) | null = null;
    private commonMenu: HTMLElement | null = null;
    private onSwitchChange: ((event: Event) => void) | null = null;

    constructor(private readonly config: ThemeConfig) {}

    init(): void {
        if (!getCommonMenu()) {
            logging.error('commonMenu element does not exist.');
            return;
        }

        this.onSwitchChange = createSwitchChangeHandler(this.config);
        this.unsubscribe = subscribeCommonMenu(this.handleCommonMenuChange);
    }

    destroy(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;

        if (this.commonMenu && this.onSwitchChange) {
            this.commonMenu.removeEventListener('change', this.onSwitchChange, true);
        }

        removeInjectedMenuElements();
        this.commonMenu = null;
        this.onSwitchChange = null;
    }

    private getChecked = (key: BooleanConfigKey): boolean => {
        return this.config.get(key);
    };

    private handleCommonMenuChange = (menu: HTMLElement, menuName: string | null): void => {
        if (this.commonMenu && this.onSwitchChange) {
            this.commonMenu.removeEventListener('change', this.onSwitchChange, true);
        }

        this.commonMenu = menu;

        if (menuName !== 'barmode') {
            return;
        }

        this.mountMenu();
        menu.addEventListener('change', this.onSwitchChange!, true);
    };

    private mountMenu(): void {
        if (!this.commonMenu || this.commonMenu.querySelector('[data-whisper-config-separator]')) {
            return;
        }

        const menuItems = this.commonMenu.querySelector('.b3-menu__items');
        if (!menuItems) {
            return;
        }

        menuItems.insertAdjacentHTML('beforeend', buildDesktopMenuHtml(this.getChecked));
    }
}
