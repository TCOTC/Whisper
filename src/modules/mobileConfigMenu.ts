import { ThemeModule } from '../types';
import {
    flatMapMenuGroups,
    MenuConfigKey,
    MenuItemDef,
    THEME_CONFIG_MOBILE_MENU_GROUPS,
    ThemeConfig,
    ThemeConfigKey,
} from './themeConfig';
import { SCHEME_MENU_DEFS, SchemeMenuDef } from './schemeManager';
import { t } from './i18n';
import { logging } from './logger';

const MENU_ENTRY_ID = 'menuWhisperTheme';
const SHEET_MENU_NAME = 'whisper-theme';
const SCHEME_CHECKED_HTML = '<svg class="b3-menu__checked"><use xlink:href="#iconSelect"></use></svg>';

/** 思源全局菜单（移动端 fullscreen 会走底部 sheet） */
type SiyuanMenu = {
    element: HTMLElement;
    remove: () => void;
    append: (element?: HTMLElement) => void;
    fullscreen: (position?: 'bottom' | 'all') => void;
    removeCB?: () => void;
};

function getSiyuanMenu(): SiyuanMenu | undefined {
    return window.siyuan.menus?.menu as SiyuanMenu | undefined;
}

function buildMenuSwitchInput(id: string, checked: boolean): string {
    return `<input class="b3-switch b3-switch--menu" id="${id}" type="checkbox"${checked ? ' checked' : ''}>`;
}

function buildSchemeMenuItemHtml(def: SchemeMenuDef, config: ThemeConfig): string {
    const current = config.get(def.key);
    const optionsHtml = def.options.map((option) => {
        const selected = current === option.value;
        return `<button type="button" class="b3-menu__item${selected ? ' b3-menu__item--selected' : ''}" data-whisper-scheme-item="${def.key}" data-whisper-scheme-value="${option.value}">
            <span class="b3-menu__label">${t(option.labelKey)}</span>
            ${selected ? SCHEME_CHECKED_HTML : ''}
        </button>`;
    }).join('');

    return `<div class="b3-menu__item" data-whisper-scheme-submenu="${def.key}">
        <svg class="b3-menu__icon"><use xlink:href="#${def.icon}"></use></svg>
        <span class="b3-menu__label">${t(def.key)}</span>
        <svg class="b3-menu__icon b3-menu__icon--small"><use xlink:href="#iconRight"></use></svg>
        <div class="b3-menu__submenu"><div class="b3-menu__items">${optionsHtml}</div></div>
    </div>`;
}

function buildSwitchMenuItemHtml({ key, icon }: MenuItemDef, config: ThemeConfig): string {
    return `<label class="b3-menu__item" data-whisper-config-item="${key}">
        <svg class="b3-menu__icon"><use xlink:href="#${icon}"></use></svg>
        <span class="fn__flex-center">${t(key)}</span>
        <span class="fn__space fn__flex-1"></span>
        ${buildMenuSwitchInput(key, config.get(key))}
    </label>`;
}

function buildSheetMenuHtml(config: ThemeConfig): string {
    const separator = '<button type="button" class="b3-menu__separator"></button>';
    const schemeItems = SCHEME_MENU_DEFS.map((def) => buildSchemeMenuItemHtml(def, config)).join('');
    const switchItems = flatMapMenuGroups(THEME_CONFIG_MOBILE_MENU_GROUPS, {
        separator: () => separator,
        item: (item) => buildSwitchMenuItemHtml(item, config),
    }).join('');

    return `${schemeItems}${separator}${switchItems}`;
}

function appendMenuHtml(menu: SiyuanMenu, html: string): void {
    const template = document.createElement('template');
    template.innerHTML = html;
    Array.from(template.content.children).forEach((child) => {
        menu.append(child as HTMLElement);
    });
}

function syncSchemeChecked(submenu: Element, selected: Element): void {
    submenu.querySelectorAll('[data-whisper-scheme-value]').forEach((item) => {
        const isSelected = item === selected;
        item.classList.toggle('b3-menu__item--selected', isSelected);
        item.querySelector('.b3-menu__checked')?.remove();
        if (isSelected) {
            item.insertAdjacentHTML('beforeend', SCHEME_CHECKED_HTML);
        }
    });
}

/** 移动端侧栏入口与底部 sheet 配置菜单 */
export class MobileConfigMenu implements ThemeModule {
    private observer: MutationObserver | null = null;
    private mobileMenu: HTMLElement | null = null;
    private onEntryClick: ((event: MouseEvent) => void) | null = null;
    private sheetMenu: SiyuanMenu | null = null;

    constructor(private readonly config: ThemeConfig) {}

    init(): void {
        this.mobileMenu = document.getElementById('menu');
        if (!this.mobileMenu) {
            logging.error('mobileMenu element does not exist.');
            return;
        }

        this.onEntryClick = (event: MouseEvent) => {
            let target = event.target as HTMLElement | null;
            while (target && this.mobileMenu && !target.isEqualNode(this.mobileMenu)) {
                if (target.id === MENU_ENTRY_ID) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.openSheet();
                    break;
                }
                target = target.parentElement;
            }
        };

        const tryMountEntry = (): boolean => {
            if (document.getElementById(MENU_ENTRY_ID)) {
                return true;
            }

            // v3.8 右侧栏改为分组菜单，入口锚到「设置」项
            const anchor = document.getElementById('menuSettings');
            if (!anchor) {
                return false;
            }

            anchor.insertAdjacentHTML('beforebegin', `<div class="b3-menu__item" id="${MENU_ENTRY_ID}">
                <svg class="b3-menu__icon"><use xlink:href="#iconTheme"></use></svg>
                <span class="b3-menu__label">${t('whisper_theme_menu')}</span>
            </div>`);
            this.mobileMenu?.addEventListener('click', this.onEntryClick!, true);
            return true;
        };

        if (tryMountEntry()) {
            return;
        }

        this.observer = new MutationObserver(() => {
            if (!tryMountEntry()) {
                return;
            }
            this.observer?.disconnect();
            this.observer = null;
        });

        this.observer.observe(this.mobileMenu, { childList: true, subtree: true });

        setTimeout(() => {
            this.observer?.disconnect();
            this.observer = null;
        }, 60000);
    }

    destroy(): void {
        this.observer?.disconnect();
        this.observer = null;

        if (this.mobileMenu && this.onEntryClick) {
            this.mobileMenu.removeEventListener('click', this.onEntryClick, true);
        }

        document.getElementById(MENU_ENTRY_ID)?.remove();
        this.closeSheet();

        this.mobileMenu = null;
        this.onEntryClick = null;
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

    private handleSchemeClick = (event: MouseEvent): void => {
        const button = event.target instanceof Element
            ? event.target.closest('[data-whisper-scheme-value]')
            : null;
        const key = button?.getAttribute('data-whisper-scheme-item');
        if (!button || !key) {
            return;
        }

        this.config.set(key as ThemeConfigKey, button.getAttribute('data-whisper-scheme-value') ?? '');
        const submenu = button.closest('.b3-menu__submenu');
        if (submenu) {
            syncSchemeChecked(submenu, button);
        }
        event.preventDefault();
        event.stopPropagation();
    };

    private unbindSheetEvents(menu: SiyuanMenu): void {
        menu.element.removeEventListener('change', this.handleSwitchChange, true);
        menu.element.removeEventListener('click', this.handleSchemeClick, true);
        if (this.sheetMenu === menu) {
            this.sheetMenu = null;
        }
    }

    private openSheet(): void {
        const menu = getSiyuanMenu();
        if (!menu) {
            logging.error('commonMenu does not exist.');
            return;
        }

        this.closeSheet();
        menu.remove();
        menu.element.setAttribute('data-name', SHEET_MENU_NAME);
        appendMenuHtml(menu, buildSheetMenuHtml(this.config));

        this.sheetMenu = menu;
        menu.element.addEventListener('change', this.handleSwitchChange, true);
        menu.element.addEventListener('click', this.handleSchemeClick, true);
        menu.removeCB = () => {
            this.unbindSheetEvents(menu);
        };

        menu.fullscreen();
    }

    private closeSheet(): void {
        const menu = this.sheetMenu ?? getSiyuanMenu();
        if (!menu || menu.element.getAttribute('data-name') !== SHEET_MENU_NAME) {
            if (this.sheetMenu) {
                this.unbindSheetEvents(this.sheetMenu);
            }
            return;
        }

        this.unbindSheetEvents(menu);
        menu.remove();
    }
}
