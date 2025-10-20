import { logging } from './logger';
import { THEME_LIGHT_MODE, THEME_DARK_MODE, getOSThemeMode, getThemeCurrentMode, getCurrentThemeByValue, getOSThemeModeValue, getThemeCurrentModeValue, getCurrentTheme } from './utils';

/**
 * 处理主题切换
 * @param type 事件类型
 * @param event 鼠标事件
 */
export function themeSwitch(type: string, event: MouseEvent): void {
    // 判断是否切换了外观模式
    switch (type) {
        case 'commonMenu': {
            // v3.3.0 之后可以通过点击的按钮的 data-id 属性来获取切换后的模式 https://github.com/siyuan-note/siyuan/pull/15052
            const menuId = (event.target as HTMLElement).closest('.b3-menu__item')?.getAttribute('data-id');
            if (!menuId || !['themeLight', 'themeDark', 'themeOS'].includes(menuId)) return;
            
            // 如果点击了"跟随系统"，则切换后的模式是系统模式
            const targetMode = menuId === 'themeOS' ? getOSThemeMode() : menuId === 'themeLight' ? THEME_LIGHT_MODE : THEME_DARK_MODE;

            // 如果切换后的模式不变，或者切换后的主题（切换后的模式对应的主题）不是 Whisper，则跳过
            if (targetMode === getThemeCurrentMode() || 'Whisper' !== getCurrentTheme(targetMode)) return;
            break;
        }
        case 'dialog': {
            const target = event.target as Element;
            const modeValue = parseInt((target.closest('#mode') as HTMLSelectElement)?.value);
            if (isNaN(modeValue) || ![0, 1, 2].includes(modeValue)) return;
            
            // 0: Light, 1: Dark, 2: OS
            const targetModeValue = modeValue === 2 ? getOSThemeModeValue() : modeValue;

            // 如果切换后的模式不变，或者切换后的主题（切换后的模式对应的主题）不是 Whisper，则跳过
            if (targetModeValue === getThemeCurrentModeValue() || 'Whisper' !== getCurrentThemeByValue(targetModeValue)) return;
            break;
        }
        default:
            return;
    }
    
    applyAnimation(event);
}

/**
 * 执行主题切换动画
 * @param event 鼠标事件
 */
function applyAnimation(event: MouseEvent): void {
    // 如果不支持 View Transitions API 就直接返回
    if (!document.startViewTransition) {
        logging.error('View Transitions API is not supported');
        return;
    }

    const transition = document.startViewTransition();

    const x = event.clientX;
    const y = event.clientY;

    const targetRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
    );

    const styleElement = document.createElement('style');
    styleElement.innerHTML = '::view-transition-old(root),::view-transition-new(root){animation: none;}';
    document.head.appendChild(styleElement);

    transition.ready.then(() => {
        const animation = document.documentElement.animate(
            {
                clipPath: [
                    `circle(0 at ${x}px ${y}px)`,
                    `circle(${targetRadius}px at ${x}px ${y}px)`
                ]
            },
            {
                duration: 550,
                pseudoElement: '::view-transition-new(root)',
                easing: 'ease-in-out'
            }
        );

        // 过程中点击，立即结束动画
        const clickHandler = () => {
            animation.finish();
        };
        document.addEventListener('mousedown', clickHandler);

        // 动画结束后需要延迟一点移除 style 元素，否则会闪烁
        animation.onfinish = () => {
            document.removeEventListener('mousedown', clickHandler);
            setTimeout(() => {
                styleElement?.remove();
            }, 300);
        };
    });
}