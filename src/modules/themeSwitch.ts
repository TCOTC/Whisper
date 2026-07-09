import { logging } from './logger';

/** 思源外观模式：0 明亮、1 暗黑、2 跟随系统（设置项，解析后仍为 0 / 1） */

const isSystemLight = () => window.matchMedia('(prefers-color-scheme: light)').matches;

/** 读取当前已解析的外观模式及对应主题包名 */
function readAppearance() {
    const appearance = window.siyuan.config?.appearance;
    let isLight: boolean;
    if (appearance?.modeOS) {
        isLight = isSystemLight();
    } else if (appearance?.mode === 0) {
        isLight = true;
    } else if (appearance?.mode === 1) {
        isLight = false;
    } else {
        const domName = document.documentElement.getAttribute('data-theme-mode');
        if (domName === 'light') {
            isLight = true;
        } else if (domName === 'dark') {
            isLight = false;
        } else {
            isLight = isSystemLight();
        }
    }
    return {
        isLight,
        lightTheme: appearance?.themeLight ?? document.documentElement.getAttribute('data-light-theme') ?? '',
        darkTheme: appearance?.themeDark ?? document.documentElement.getAttribute('data-dark-theme') ?? '',
    };
}

/** 获取当前主题 */
export function getCurrentTheme(): string {
    const { isLight, lightTheme, darkTheme } = readAppearance();
    return isLight ? lightTheme : darkTheme;
}

/** 判断切换至目标外观模式后是否应播放主题切换动画 */
function shouldAnimateThemeSwitch(targetIsLight: boolean): boolean {
    const { isLight, lightTheme, darkTheme } = readAppearance();
    if (targetIsLight === isLight) {
        // 目标模式与当前模式相同
        return false;
    }
    if ((targetIsLight ? lightTheme : darkTheme) !== 'Whisper') {
        // 目标主题不是浅吟
        return false;
    }
    return true;
}

/**
 * 顶栏外观菜单切换主题
 */
export function themeSwitchFromMenu(event: MouseEvent): void {
    // v3.3.0 之后可以通过点击的按钮的 data-id 属性来获取切换后的模式 https://github.com/siyuan-note/siyuan/pull/15052
    const menuId = (event.target as HTMLElement).closest('.b3-menu__item')?.getAttribute('data-id');
    let targetIsLight: boolean | undefined;
    switch (menuId) {
        case 'themeLight':
            targetIsLight = true;
            break;
        case 'themeDark':
            targetIsLight = false;
            break;
        case 'themeOS':
            targetIsLight = isSystemLight();
            break;
        default:
            return;
    }

    if (shouldAnimateThemeSwitch(targetIsLight)) {
        applyAnimation();
    }
}

/**
 * 设置面板外观模式切换主题
 */
export function themeSwitchFromDialog(select: HTMLSelectElement): void {
    const value = parseInt(select.value);
    let targetIsLight: boolean | undefined;
    if (value === 0) {
        targetIsLight = true;
    } else if (value === 1) {
        targetIsLight = false;
    } else if (value === 2) {
        targetIsLight = isSystemLight();
    } else {
        return;
    }

    if (shouldAnimateThemeSwitch(targetIsLight)) {
        applyAnimation();
    }
}

/**
 * 执行主题切换动画（交叉淡入淡出）
 */
function applyAnimation(): void {
    // 如果不支持 View Transitions API 就直接返回
    if (!document.startViewTransition) {
        logging.error('View Transitions API is not supported');
        return;
    }

    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
        ::view-transition-old(root),
        ::view-transition-new(root) {
            animation-duration: 700ms;
            animation-timing-function: ease-in-out;
        }
    `;
    document.head.appendChild(styleElement);

    const transition = document.startViewTransition();

    // 过程中点击，立即结束动画
    const clickHandler = () => {
        transition.skipTransition();
    };
    document.addEventListener('mousedown', clickHandler);

    transition.finished.finally(() => {
        document.removeEventListener('mousedown', clickHandler);
        // 动画结束后需要延迟一点移除 style 元素，否则会闪烁
        setTimeout(() => {
            styleElement.remove();
        }, 300);
    });
}
