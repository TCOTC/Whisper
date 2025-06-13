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

/**
 * 获取文件内容
 * @param path 工作空间路径下的文件路径
 * @returns 文件内容或错误信息
 */
export const getFile = async (path: string): Promise<string | { code: number; msg: string; data: null }> => {
    try {
        const response = await fetch('/api/file/getFile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path })
        });

        if (response.status === 200) {
            return await response.text();
        } else if (response.status === 202) {
            return await response.json();
        } else {
            return {
                code: response.status,
                msg: `Unknown error, status code:${response.status}`,
                data: null
            };
        }
    } catch (error) {
        return {
            code: 500,
            msg: `Request exception:${error instanceof Error ? error.message : String(error)}`,
            data: null
        };
    }
};

/**
 * 写入文件或创建文件夹
 * @param path 工作空间路径下的文件路径
 * @param options 选项
 * @param options.isDir 是否为创建文件夹，为 true 时仅创建文件夹，忽略 file
 * @param options.modTime 最近访问和修改时间，Unix time
 * @param options.file 要上传的文件内容（File 对象或 Blob）
 * @returns 操作结果
 */
export const putFile = async (
    path: string,
    options: {
        isDir?: boolean;
        modTime?: number;
        file?: File | Blob;
    } = {}
): Promise<{ code: number; msg: string; data: null }> => {
    try {
        const formData = new FormData();
        formData.append('path', path);
        
        if (options.isDir !== undefined) {
            formData.append('isDir', options.isDir.toString());
        }
        
        if (options.modTime !== undefined) {
            formData.append('modTime', options.modTime.toString());
        }
        
        if (options.file && !options.isDir) {
            formData.append('file', options.file);
        }
        
        const response = await fetch('/api/file/putFile', {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    } catch (error) {
        return {
            code: 500,
            msg: `Request exception:${error instanceof Error ? error.message : String(error)}`,
            data: null
        };
    }
};