import { ThemeModule } from '../types';
import {
    flatMapMenuGroups,
    MenuConfigKey,
    MenuItemDef,
    THEME_CONFIG_MENU_GROUPS,
    ThemeConfig,
    ThemeConfigKey,
} from './themeConfig';
import { SCHEME_MENU_DEFS, SchemeMenuDef } from './schemeManager';
import { t } from './i18n';
import { logging } from './logger';

const MENU_ENTRY_ID = 'menuWhisperTheme';
const CONFIG_MODEL_ATTR = 'data-whisper-config-model';

function schemeSelectId(key: ThemeConfigKey): string {
    return `whisper-scheme-${key}`;
}

/** 移动端 select，对齐思源 config/render/render.ts 的 genSelectOptionsHtml */
function buildSchemeSelectHtml(id: string, def: SchemeMenuDef, current: string): string {
    const optionsHtml = def.options.map((option) =>
        `<option value="${option.value}"${current === option.value ? ' selected' : ''}>${t(option.labelKey)}</option>`,
    ).join('');

    return `<select class="b3-select fn__flex-center fn__size200" id="${id}">${optionsHtml}</select>`;
}

/** 移动端 select 行，对齐思源 renderControlParts select 分支（config-wrap） */
function buildSchemeSelectRow(def: SchemeMenuDef, config: ThemeConfig): string {
    const selectId = schemeSelectId(def.key);

    return `<div class="fn__flex b3-label config-item config-wrap" data-whisper-scheme-item="${def.key}">
        <div class="fn__flex-1">
            <div class="config-name">${t(def.key)}</div>
        </div>
        <span class="fn__space"></span>
        ${buildSchemeSelectHtml(selectId, def, config.get(def.key))}
    </div>`;
}

function buildSchemeSelectRows(config: ThemeConfig): string {
    return SCHEME_MENU_DEFS.map((def) => buildSchemeSelectRow(def, config)).join('');
}

function buildPanelSwitchRow({ key }: MenuItemDef, config: ThemeConfig): string {
    return `<label class="fn__flex b3-label config-item" data-whisper-config-item="${key}">
        <div class="fn__flex-1">
            <div class="config-name">${t(key)}</div>
        </div>
        <span class="fn__space"></span>
        <input class="b3-switch fn__flex-center" id="${key}" type="checkbox"${config.get(key) ? ' checked' : ''}>
    </label>`;
}

/** 移动端配置面板，参考思源 mobile/menu 与 config-group / config-items 结构 */
function buildPanelHtml(config: ThemeConfig): string {
    const separator = '<div class="fn__hr" data-whisper-config-separator></div>';
    const schemeRows = buildSchemeSelectRows(config);
    const switchRows = flatMapMenuGroups(THEME_CONFIG_MENU_GROUPS, {
        separator: () => separator,
        item: (item) => buildPanelSwitchRow(item, config),
    }).join('');

    return `<div class="config config--mobile">
        <div class="config-group" data-whisper-config-group>
            <div class="config-items">
                ${schemeRows}${separator}${switchRows}
            </div>
        </div>
    </div>`;
}

function openConfigPanel(config: ThemeConfig): HTMLElement | null {
    const modelElement = document.getElementById('model');
    if (!modelElement) {
        logging.error('model element does not exist.');
        return null;
    }

    modelElement.style.transform = 'translateY(0px)';
    modelElement.style.zIndex = (++window.siyuan.zIndex).toString();
    modelElement.setAttribute(CONFIG_MODEL_ATTR, '');

    const iconElement = modelElement.querySelector('.toolbar__icon');
    iconElement?.classList.remove('fn__none');
    iconElement?.querySelector('use')?.setAttribute('xlink:href', '#iconTheme');

    const titleElement = modelElement.querySelector('.toolbar__text');
    if (titleElement) {
        titleElement.textContent = t('whisper_theme_menu');
    }

    const modelMainElement = modelElement.querySelector('#modelMain') as HTMLElement | null;
    if (!modelMainElement) {
        return null;
    }

    modelMainElement.innerHTML = buildPanelHtml(config);
    return modelMainElement;
}

function closeConfigPanel(): void {
    const modelElement = document.getElementById('model');
    if (!modelElement?.hasAttribute(CONFIG_MODEL_ATTR)) {
        return;
    }

    modelElement.style.transform = '';
    modelElement.removeAttribute(CONFIG_MODEL_ATTR);
}

/** 移动端侧栏入口与 #model 配置面板 */
export class MobileConfigMenu implements ThemeModule {
    private observer: MutationObserver | null = null;
    private mobileMenu: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private onEntryClick: ((event: MouseEvent) => void) | null = null;

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
                    this.openPanel();
                    break;
                }
                target = target.parentElement;
            }
        };

        this.observer = new MutationObserver(() => {
            const anchor = document.getElementById('menuConfigEditor');
            if (!anchor || document.getElementById(MENU_ENTRY_ID)) {
                return;
            }

            anchor.insertAdjacentHTML('beforebegin', `<div class="b3-menu__item" id="${MENU_ENTRY_ID}">
                <svg class="b3-menu__icon"><use xlink:href="#iconTheme"></use></svg>
                <span class="b3-menu__label">${t('whisper_theme_menu')}</span>
            </div>`);
            this.mobileMenu?.addEventListener('click', this.onEntryClick!, true);
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
        this.closePanel();

        this.mobileMenu = null;
        this.onEntryClick = null;
    }

    private handlePanelChange = (event: Event): void => {
        const target = event.target;

        if (target instanceof HTMLInputElement && target.classList.contains('b3-switch')) {
            const key = target.closest('[data-whisper-config-item]')?.getAttribute('data-whisper-config-item');
            if (!key) {
                return;
            }

            this.config.set(key as MenuConfigKey, target.checked);
            event.stopPropagation();
            return;
        }

        if (target instanceof HTMLSelectElement && target.classList.contains('b3-select')) {
            const key = target.id.startsWith('whisper-scheme-')
                ? target.id.slice('whisper-scheme-'.length)
                : target.closest('[data-whisper-scheme-item]')?.getAttribute('data-whisper-scheme-item');
            if (!key) {
                return;
            }

            this.config.set(key as ThemeConfigKey, target.value);
            event.stopPropagation();
        }
    };

    private openPanel(): void {
        this.closePanel();

        const panel = openConfigPanel(this.config);
        if (!panel) {
            return;
        }

        this.panel = panel;
        panel.addEventListener('change', this.handlePanelChange, true);
    }

    private closePanel(): void {
        if (this.panel) {
            this.panel.removeEventListener('change', this.handlePanelChange, true);
        }
        this.panel = null;
        closeConfigPanel();
    }
}
