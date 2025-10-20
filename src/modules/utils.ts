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

export const THEME_LIGHT_MODE = 'light';
export const THEME_DARK_MODE = 'dark';
export const THEME_LIGHT_MODE_VALUE = 0;
export const THEME_DARK_MODE_VALUE = 1;
export const THEME_OS_MODE_VALUE = 2;

/**
 * 获取当前真实主题模式
 */
export const getThemeCurrentMode = (): string => {
    const mode = window.siyuan.config?.appearance?.mode;
    if (mode) {
        return mode === 0 ? THEME_LIGHT_MODE : THEME_DARK_MODE;
    } else {
        return document.documentElement.getAttribute('data-theme-mode') || '';
    }
};

/**
 * 获取当前真实主题模式数字
 */
export const getThemeCurrentModeValue = (): number => {
    const modeValue = window.siyuan.config?.appearance?.mode; // 这个就是真实主题模式数字
    if (modeValue) {
        return modeValue;
    }
    const mode = document.documentElement.getAttribute('data-theme-mode')
    if (mode) {
        return mode === THEME_LIGHT_MODE ? THEME_LIGHT_MODE_VALUE : THEME_DARK_MODE_VALUE;
    }
    return NaN;
};

/**
 * 获取系统主题模式
 */
export const getOSThemeMode = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? THEME_LIGHT_MODE : THEME_DARK_MODE;
};

/**
 * 获取系统主题模式数字
 */
export const getOSThemeModeValue = (): 0 | 1 => {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? THEME_LIGHT_MODE_VALUE : THEME_DARK_MODE_VALUE;
};

/**
 * 获取当前主题
 */
export const getCurrentTheme = (mode: string = getThemeCurrentMode()): string => {
    if (mode === THEME_LIGHT_MODE) {
        return getCurrentThemeLight();
    } else if (mode === THEME_DARK_MODE) {
        return getCurrentThemeDark();
    } else {
        return '';
    }
};

/**
 * 通过模式数字获取当前主题
 */
export const getCurrentThemeByValue = (modeValue: number): string => {
    if (modeValue === THEME_LIGHT_MODE_VALUE) {
        return getCurrentThemeLight();
    } else if (modeValue === THEME_DARK_MODE_VALUE) {
        return getCurrentThemeDark();
    } else if (modeValue === THEME_OS_MODE_VALUE) {
        return getCurrentThemeByValue(getOSThemeModeValue());
    } else {
        return '';
    }
};

/**
 * 获取当前明亮主题
 */
export const getCurrentThemeLight = (): string => {
    const themeLight = window.siyuan.config?.appearance?.themeLight;
    if (themeLight) {
        return themeLight;
    } else {
        return document.documentElement.getAttribute('data-light-theme') || '';
    }
};

/**
 * 获取当前暗黑主题
 */
export const getCurrentThemeDark = (): string => {
    const themeDark = window.siyuan.config?.appearance?.themeDark;
    if (themeDark) {
        return themeDark;
    } else {
        return document.documentElement.getAttribute('data-dark-theme') || '';
    }
};

/**
 * 生成 UUID，思源原生函数
 * @returns UUID
 */
export const genUUID = () => ([1e7].toString() + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (parseInt(c, 10) ^ (window.crypto.getRandomValues(new Uint32Array(1))[0] & (15 >> (parseInt(c, 10) / 4)))).toString(16)
);