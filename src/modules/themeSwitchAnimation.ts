import { logging } from './logger';
import { getThemeDark, getThemeLight } from './utils';

/**
 * 执行主题切换动画
 */
export function themeSwitchAnimation(e: MouseEvent): void {
    // 如果不支持 View Transitions API 就直接返回
    if (!document.startViewTransition) {
        logging.error('View Transitions API is not supported');
        return;
    }

    // TODO功能 给插件菜单和外观模式菜单 PR data-id 属性，然后就不用根据菜单项的文本判断了。
    //  方案换了之后要提升主题最低版本号
    //  data-id="themeLight"  data-id="themeDark"  data-id="themeOS"
    //  要用上 utils 里的函数

    const siyuanLanguages = window.siyuan?.languages;
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
    const menuItem = (e.target as HTMLElement).closest('.b3-menu__item');
    if (!menuItem) return;
    
    let targetMode = menuItem.textContent || '';
    if (targetMode === themeOS) {
        // 如果点击了"跟随系统"，则切换后的模式是系统模式
        targetMode = window.matchMedia('(prefers-color-scheme: light)').matches ? themeLight : themeDark;
    }

    // 当前模式
    const currentMode = window.siyuan?.config?.appearance?.mode === 0 ? themeLight : themeDark;
    // 如果切换后的模式不变，则跳过
    if (targetMode === currentMode) return;

    // 获取切换后的主题（切换后的模式对应的主题）
    const targetTheme = targetMode === themeLight ? getThemeLight() : getThemeDark();
        
    // 如果切换后的主题不是 Whisper，则跳过
    if (targetTheme !== 'Whisper') return;

    const transition = document.startViewTransition();

    const x = e.clientX;
    const y = e.clientY;

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
        document.addEventListener('click', () => {
            animation.finish();
        }, { once: true }); // 事件只触发一次

        // 动画结束后需要延迟一点移除 style 元素，否则会闪烁
        animation.onfinish = () => {
            setTimeout(() => {
                style?.remove();
            }, 500);
        };
    });
}