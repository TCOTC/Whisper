import { logging } from './logger';
import { getThemeDark, getThemeLight, getOSThemeMode } from './utils';

/**
 * 处理主题切换
 * @param type 事件类型
 * @param event 鼠标事件
 */
export function themeSwitch(type: string, event: MouseEvent): void {
    // 判断是否切换了外观模式
    switch (type) {
        case 'commonMenu': {
            // TODO功能 给插件菜单和外观模式菜单 PR data-id 属性，然后就不用根据菜单项的文本判断了。https://github.com/siyuan-note/siyuan/pull/15052
            //  data-id="themeLight"  data-id="themeDark"  data-id="themeOS"
            //  要用上 utils 里的函数
            //  要提升主题最低版本号
            //  case 中重复的逻辑移动到 switch 语句外

            const siyuanLanguages = window.siyuan.languages;
            if (!siyuanLanguages) {
                logging.error('window.siyuan.languages is not available');
                return;
            }

            const { themeLight, themeDark, themeOS } = siyuanLanguages;

            // 确保主题模式变量存在
            if (!themeLight || !themeDark || !themeOS) {
                logging.error('Theme mode variables are not properly defined');
                return;
            }

            // 获取切换后的模式（通过点击的按钮判断）
            const menuItem = (event.target as HTMLElement).closest('.b3-menu__item');
            if (!menuItem) return;

            let targetMode = menuItem.textContent || '';
            if (targetMode === themeOS) {
                // 如果点击了"跟随系统"，则切换后的模式是系统模式
                targetMode = window.matchMedia('(prefers-color-scheme: light)').matches ? themeLight : themeDark;
            }

            // 当前模式
            const currentMode = window.siyuan.config?.appearance?.mode === 0 ? themeLight : themeDark;
            // 如果切换后的模式不变，则跳过
            if (targetMode === currentMode) return;

            // 获取切换后的主题（切换后的模式对应的主题）
            const targetTheme = targetMode === themeLight ? getThemeLight() : getThemeDark();

            // 如果切换后的主题不是 Whisper，则跳过
            if (targetTheme !== 'Whisper') return;
            break;
        }
        case 'dialog': {
            const target = event.target as Element;
            const modeSelect = target.closest('#mode') as HTMLSelectElement;
            if (!modeSelect) return;

            const modeSelectValue = parseInt(modeSelect.value);
            
            // 0: Light, 1: Dark, 2: OS
            const newModeValue = modeSelectValue === 2 ? (getOSThemeMode() === 'light' ? 0 : 1) : modeSelectValue;
            const currentModeValue = window.siyuan.config?.appearance?.mode;

            // 如果外观模式没有变化，则跳过
            if (newModeValue === currentModeValue) return;
            
            // 判断切换后会使用哪个主题
            const targetTheme = newModeValue === 0 ? getThemeLight() : getThemeDark();
            
            // 如果切换后的主题不是 Whisper，则跳过
            if (targetTheme !== 'Whisper') return;
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

    const style = document.createElement('style');
    style.innerHTML = '::view-transition-old(root),::view-transition-new(root){animation: none;}';
    document.head.appendChild(style);

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
        document.addEventListener('click', clickHandler);

        // 动画结束后需要延迟一点移除 style 元素，否则会闪烁
        animation.onfinish = () => {
            document.removeEventListener('click', clickHandler);
            setTimeout(() => {
                style?.remove();
            });
        };
    });
}