import { pushErrMsg, pushMsg } from './api';

/**
 * 轮询等待 DOM 元素出现
 * @param selector 目标元素选择器
 * @param shouldAbort 每次重试前调用，若返回 true 则中止等待并返回 null（不计为超时）
 * @returns 找到的元素，超时或中止时返回 null
 */
export function waitForElement(
    selector: string,
    shouldAbort?: () => boolean,
): Promise<HTMLElement | null> {
    return new Promise((resolve) => {
        let retryCount = 0;

        const tryFind = () => {
            if (shouldAbort?.()) {
                resolve(null);
                return;
            }

            const element = document.querySelector(selector);
            if (element instanceof HTMLElement) {
                resolve(element);
                return;
            }

            if (retryCount >= 50) { // 最大重试 50 次
                resolve(null);
                return;
            }

            retryCount++;
            setTimeout(tryFind, 100); // 间隔 100ms 重试
        };

        tryFind();
    });
}

/**
 * 判断是否为内核只读模式
 */
export function isReadOnly(): boolean {
    return !!window.siyuan.config?.readonly || !!window.siyuan.isPublish;
}

/**
 * 判断是否为移动设备（手机）
 */
export const isMobile = (): boolean => {
    return !!window.siyuan.mobile;
};

/**
 * 判断是否为 iPad
 */
export const isIPad = () => {
    return navigator.userAgent.indexOf('iPad') > -1;
};

/**
 * 判断是否为触屏设备（安卓平板只能通过这个）
 */
export const isTouchDevice = () => {
    return ('ontouchstart' in window) && navigator.maxTouchPoints > 1;
};

/**
 * 考虑浏览器访问，不能用 window.siyuan.config.system.os
 * 
 * window.siyuan.config.system.os
 * The operating system name determined at compile time (obtained using the command `go tool dist list`)
 * - `android`: Android
 * - `darwin`: macOS
 * - `ios`: iOS
 * - `linux`: Linux
 * - `windows`: Windows
 */

/**
 * 判断是否为 Windows 系统
 */
export const isWindows = (): boolean => {
    return navigator.platform.toUpperCase().indexOf('WIN') > -1;
};

/**
 * 判断是否为 Mac 系统
 */
export const isMac = (): boolean => {
    return navigator.platform.toUpperCase().indexOf('MAC') > -1;
};

/**
 * 判断是否为本地路径
 */
export const isLocalPath = (link: string) => {
    if (!link) {
        return false;
    }

    link = link.trim();
    if (1 > link.length) {
        return false;
    }

    link = link.toLowerCase();
    if (link.startsWith('assets/') || link.startsWith('file://') || link.startsWith('\\\\') /* Windows 网络共享路径 */) {
        return true;
    }

    if (isWindows()) {
        const colonIdx = link.indexOf(':');
        return 1 === colonIdx; // 冒号前面只有一个字符认为是 Windows 盘符而不是网络协议
    }
    return link.startsWith('/');
};

/**
 * 显示消息（通过内核接口推送，由思源前端统一渲染）
 * @param message 消息内容
 * @param timeout 消息显示时间，单位：毫秒。0：手动关闭；-1：永不关闭
 * @param type 消息类型，info：普通消息，error：错误消息
 * @returns 消息 ID
 */
export async function showMessage(
    message: string,
    timeout = 6000,
    type: 'info' | 'error',
): Promise<string | undefined> {
    if (!message) {
        return;
    }

    const response = await (type === 'error' ? pushErrMsg(message, timeout) : pushMsg(message, timeout));
    if (response.code !== 0) {
        return;
    }

    return response.data?.id;
}
