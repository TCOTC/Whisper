/**
 * 判断是否为发布服务
 */
export const isPublish = (): boolean => {
    return !!window.siyuan.isPublish;
};

/**
 * 判断是否为移动设备（手机）
 */
export const isMobile = (): boolean => {
    // TODO跟进 https://github.com/siyuan-note/siyuan/issues/13952 如果支持了切换界面，需要在切换界面之后重新执行被跳过的程序
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

// TODO功能 看看能不能直接从 windows.siyuan 获取设备类型，如果可行的话就更换下面的方法
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
 * 获取主题模式
 */
export const getThemeMode = (): string | false => {
    const mode = window.siyuan.config?.appearance?.mode;
    if (mode) {
        return mode === 0 ? 'light' : 'dark';
    } else {
        return document.documentElement.getAttribute('data-theme-mode') || false;
    }
};

/**
 * 获取系统主题模式
 */
export const getOSThemeMode = (): string | false => {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

/**
 * 获取明亮主题
 */
export const getThemeLight = (): string | false => {
    const themeLight = window.siyuan.config?.appearance?.themeLight;
    if (themeLight) {
        return themeLight;
    } else {
        return document.documentElement.getAttribute('data-light-theme') || false;
    }
};

/**
 * 获取暗黑主题
 */
export const getThemeDark = (): string | false => {
    const themeDark = window.siyuan.config?.appearance?.themeDark;
    if (themeDark) {
        return themeDark;
    } else {
        return document.documentElement.getAttribute('data-dark-theme') || false;
    }
};

/**
 * 获取当前主题
 */
export const getCurrentTheme = (): string | false => {
    const themeMode = getThemeMode();
    const themeLight = getThemeLight();
    const themeDark = getThemeDark();
    if (themeMode && themeLight && themeDark) {
        return themeMode === 'light' ? themeLight : themeDark;
    } else {
        return false;
    }
};

/**
 * 生成 UUID，思源原生函数
 * @returns UUID
 */
export const genUUID = () => ([1e7].toString() + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (parseInt(c, 10) ^ (window.crypto.getRandomValues(new Uint32Array(1))[0] & (15 >> (parseInt(c, 10) / 4)))).toString(16)
);