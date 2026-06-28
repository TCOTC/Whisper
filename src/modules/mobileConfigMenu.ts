import { ThemeModule } from '../types';
import { THEME_CONFIG_MENU_ITEMS, MenuConfigKey, ThemeConfig } from './themeConfig';
import { t } from './i18n';
import { logging } from './logger';

const MENU_ENTRY_ID = 'menuWhisperTheme';
const CONFIG_MODEL_ATTR = 'data-whisper-config-model';

/** 移动端配置面板开关行，参考 config/render/fragments.ts genSwitchRow */
function buildPanelHtml(config: ThemeConfig): string {
    const rows = THEME_CONFIG_MENU_ITEMS.map(({ key }) => {
        return `<label class="fn__flex b3-label config-item" data-whisper-config-item="${key}">
            <div class="fn__flex-1">
                <div class="config-name">${t(key)}</div>
            </div>
            <span class="fn__space"></span>
            <input class="b3-switch fn__flex-center" id="${key}" type="checkbox"${config.get(key) ? ' checked' : ''}>
        </label>`;
    }).join('');

    return `<div class="config config--mobile">${rows}</div>`;
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

    private openPanel(): void {
        this.closePanel();

        const panel = openConfigPanel(this.config);
        if (!panel) {
            return;
        }

        this.panel = panel;
        panel.addEventListener('change', this.handleSwitchChange, true);
    }

    private closePanel(): void {
        if (this.panel) {
            this.panel.removeEventListener('change', this.handleSwitchChange, true);
        }
        this.panel = null;
        closeConfigPanel();
    }
}
