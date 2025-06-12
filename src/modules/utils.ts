/**
 * 判断是否为移动设备
 */
export const isMobile = (): boolean => {
    // TODO跟进 https://github.com/siyuan-note/siyuan/issues/13952 如果支持了切换界面，需要在切换界面之后重新执行被跳过的程序
    return !!window.siyuan?.mobile;
};

// TODO功能 看看能不能直接从 windows.siyuan 获取设备类型，如果可行的话就更换下面的方法

/**
 * 判断是否为 Windows 系统
 */
export const isWindows = (): boolean => {
    return navigator.platform.toUpperCase().indexOf("WIN") > -1;
};

/**
 * 判断是否为 Mac 系统
 */
export const isMac = (): boolean => {
    return navigator.platform.toUpperCase().indexOf("MAC") > -1;
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
    if (link.startsWith("assets/") || link.startsWith("file://") || link.startsWith("\\\\") /* Windows 网络共享路径 */) {
        return true;
    }

    if (isWindows()) {
        const colonIdx = link.indexOf(":");
        return 1 === colonIdx; // 冒号前面只有一个字符认为是 Windows 盘符而不是网络协议
    }
    return link.startsWith("/");
};