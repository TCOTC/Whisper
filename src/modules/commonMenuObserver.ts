import { logging } from './logger';

export type CommonMenuListener = (menu: HTMLElement, menuName: string | null) => void;

let menuElement: HTMLElement | null = null;
let observer: MutationObserver | null = null;
const listeners = new Set<CommonMenuListener>();

function notify(): void {
    const menu = getCommonMenu();
    if (!menu) {
        return;
    }

    const menuName = menu.getAttribute('data-name');
    listeners.forEach((listener) => {
        listener(menu, menuName);
    });
}

function ensureObserving(): void {
    if (observer) {
        return;
    }

    menuElement = document.getElementById('commonMenu');
    if (!menuElement) {
        logging.error('commonMenu element does not exist.');
        return;
    }

    observer = new MutationObserver(() => {
        notify();
    });
    observer.observe(menuElement, { attributes: true, attributeFilter: ['data-name'] });
}

function tearDown(): void {
    observer?.disconnect();
    observer = null;
    menuElement = null;
}

/** 获取 #commonMenu 元素 */
export function getCommonMenu(): HTMLElement | null {
    return menuElement ?? document.getElementById('commonMenu');
}

/**
 * 订阅 #commonMenu 的 data-name 变化；首次订阅时立即回调当前状态。
 * @returns 取消订阅函数
 */
export function subscribeCommonMenu(listener: CommonMenuListener): () => void {
    ensureObserving();
    listeners.add(listener);

    const menu = getCommonMenu();
    if (menu) {
        listener(menu, menu.getAttribute('data-name'));
    }

    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
            tearDown();
        }
    };
}
