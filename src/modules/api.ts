/**
 * 获取当前系统时间
 * @returns 系统时间响应
 */
export const getCurrentTime = async (): Promise<{ code: number; msg: string; data: null }> => {
    try {
        const response = await fetch('/api/system/currentTime', {
            method: 'POST'
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

/**
 * 检查与服务器的连通性
 * @returns 连通性检查结果，true 表示连接正常，false 表示连接异常
 */
export const checkConnectivity = async (): Promise<boolean> => {
    try {
        const result = await getCurrentTime();
        return result.code === 0;
    } catch {
        return false;
    }
};

/**
 * 连通性检查缓存
 */
interface ConnectivityCache {
    isConnected: boolean;
    lastCheckTime: number;
}

let connectivityCache: ConnectivityCache | null = null;
const CONNECTIVITY_SUCCESS_CACHE_DURATION = 10 * 60 * 1000; // 成功时缓存 10 分钟

/**
 * 带缓存的连通性检查
 * @returns 连通性检查结果，true 表示连接正常，false 表示连接异常
 */
export const checkConnectivityWithCache = async (): Promise<boolean> => {
    const now = Date.now();
    
    // 检查缓存是否有效（只对成功状态使用缓存）
    if (connectivityCache && connectivityCache.isConnected) {
        if ((now - connectivityCache.lastCheckTime) < CONNECTIVITY_SUCCESS_CACHE_DURATION) {
            return true;
        }
    }
    
    // 执行新的连通性检查
    const isConnected = await checkConnectivity();
    
    // 只有成功时才更新缓存
    if (isConnected) {
        connectivityCache = {
            isConnected: true,
            lastCheckTime: now
        };
    } else {
        // 失败时清空缓存，确保下次会重新检查
        connectivityCache = null;
    }
    
    return isConnected;
};

/**
 * 获取文件内容
 * @param path 工作空间路径下的文件路径
 * @param options 重试选项
 * @param options.retryOnConnectivityError 是否在连通性错误时进行重试，默认为 false
 * @param options.retryInterval 重试间隔时间（毫秒），默认 30000 毫秒（30秒）
 * @param options.maxRetries 最大重试次数，默认 50 次
 * @returns 文件内容或错误信息
 */
export const getFile = async (
    path: string,
    options: {
        retryOnConnectivityError?: boolean;
        retryInterval?: number;
        maxRetries?: number;
    } = {}
): Promise<string | { code: number; msg: string; data: null }> => {
    const { retryOnConnectivityError = false, retryInterval = 30000, maxRetries = 50 } = options;
    let retries = 0;

    while (true) {
        try {
            // 进行连通性检查
            const isConnected = await checkConnectivityWithCache();
            if (!isConnected) {
                // 如果启用了重试且未达到最大重试次数，则等待后重试
                if (retryOnConnectivityError && retries < maxRetries) {
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, retryInterval));
                    continue;
                }
                
                return {
                    code: 503,
                    msg: 'Server connectivity check failed',
                    data: null
                };
            }

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
    }
};

/**
 * 写入文件或创建文件夹
 * @param path 工作空间路径下的文件路径
 * @param options 选项
 * @param options.isDir 是否为创建文件夹，为 true 时仅创建文件夹，忽略 file
 * @param options.modTime 最近访问和修改时间，Unix time
 * @param options.file 要上传的文件内容（File 对象或 Blob）
 * @param options.retryOnConnectivityError 是否在连通性错误时进行重试，默认为 false
 * @param options.retryInterval 重试间隔时间（毫秒），默认 30000 毫秒（30秒）
 * @param options.maxRetries 最大重试次数，默认 50 次
 * @returns 操作结果
 */
export const putFile = async (
    path: string,
    options: {
        isDir?: boolean;
        modTime?: number;
        file?: File | Blob;
        retryOnConnectivityError?: boolean;
        retryInterval?: number;
        maxRetries?: number;
    } = {}
): Promise<{ code: number; msg: string; data: null }> => {
    const { retryOnConnectivityError = false, retryInterval = 30000, maxRetries = 50 } = options;
    let retries = 0;
    
    while (true) {
        try {
            // 进行连通性检查
            const isConnected = await checkConnectivityWithCache();
            if (!isConnected) {
                // 如果启用了重试且未达到最大重试次数，则等待后重试
                if (retryOnConnectivityError && retries < maxRetries) {
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, retryInterval));
                    continue;
                }
                
                return {
                    code: 503,
                    msg: 'Server connectivity check failed',
                    data: null
                };
            }

            if (window.siyuan?.isPublish) {
                return {
                    code: 403,
                    msg: 'You are not allowed to write files in published workspace',
                    data: null
                };
            }
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
    }
};