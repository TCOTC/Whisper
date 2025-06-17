import { logging } from './logger';
import { isPublish } from './utils';
import { getFile, putFile } from './api';

/**
 * 配置值类型，支持嵌套结构
 */
type ConfigValue = string | number | boolean | null | ConfigObject | ConfigValue[];

/**
 * 配置对象类型
 */
interface ConfigObject {
    [key: string]: ConfigValue;
}

/**
 * 文件操作队列管理器，用于确保文件操作的顺序执行
 */
class FileOperationQueue {
    // 使用静态 Map 存储每个文件路径对应的操作队列
    private static queues: Map<string, Promise<unknown>> = new Map();

    /**
     * 将操作添加到队列中，确保按顺序执行
     * @param filePath 文件路径
     * @param operation 要执行的异步操作函数
     * @returns 操作的结果 Promise
     */
    static enqueue<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
        
        // 获取当前文件的操作队列，如果不存在则创建一个已完成的 Promise
        const currentPromise = this.queues.get(filePath) || Promise.resolve();
        
        // 创建新的操作 Promise，它会在当前队列中的所有操作完成后执行
        const newPromise = currentPromise.then(operation, operation);
        
        // 更新队列
        this.queues.set(filePath, newPromise);
        
        // 返回操作结果，但不将可能的错误传播到队列中
        return newPromise.catch(error => {
            logging.error(`Operation error for ${filePath}:`, error);
            throw error; // 重新抛出错误给调用者
        });
    }
}

const CONFIG_VERSION = 1;

/**
 * 本地配置，不参与同步
 */
export class LocalConfig {
    private configPath: string = '/conf/whisper-theme-config.json'; // 配置文件路径，相对于工作空间根目录
    private defaultConfig: ConfigObject = { version: CONFIG_VERSION }; // 默认配置
    private initPromise: Promise<void>; // 初始化完成的 Promise

    /**
     * 构造函数
     * @param configPath 配置文件路径，相对于工作空间根目录
     * @param defaultConfig 默认配置对象，可选
     */
    constructor(configPath?: string, defaultConfig?: ConfigObject) {
        if (isPublish()) {
            // 在发布模式下创建一个已解决的 Promise
            this.initPromise = Promise.resolve();
            return;
        }
        
        if (configPath) {
            this.configPath = configPath;
        }
        if (defaultConfig) {
            this.defaultConfig = defaultConfig;
        }

        // 保存初始化 Promise 以便其他方法等待它完成
        this.initPromise = this.init();
    }

    /**
     * 初始化配置
     */
    private async init(): Promise<void> {
        try {
            // 定义重试选项，在初始化阶段启用重试
            const retryOptions = {
                retryOnConnectivityError: true,
                retryInterval: 5000,
                maxRetries: 100
            };
            
            // 尝试读取配置
            const config = await this.readConfig(retryOptions);
            if (Object.keys(config).length === 0) {
                await this.resetConfig(retryOptions);
            } else if (config.version !== CONFIG_VERSION) {
                // 如果 version 不为 CONFIG_VERSION 或不存在，则设置为 CONFIG_VERSION
                config.version = CONFIG_VERSION;
                await this.writeConfig(config, retryOptions);
            }
        } catch {
            // 如果读取失败，重置为默认配置
            await this.resetConfig({
                retryOnConnectivityError: true,
                retryInterval: 5000,
                maxRetries: 10
            });
        }
    }

    /**
     * 读取配置文件内容
     * @param retryOptions 重试选项
     * @returns 配置对象，如果读取失败则返回空对象
     */
    private async readConfig(retryOptions?: {
        retryOnConnectivityError?: boolean;
        retryInterval?: number;
        maxRetries?: number;
    }): Promise<ConfigObject> {
        // 将读取操作添加到队列
        return FileOperationQueue.enqueue(this.configPath, async () => {
            try {
                const content = await getFile(this.configPath, retryOptions || {});
                
                // 如果文件不存在或出错，返回空对象
                if (typeof content !== 'string' || content.trim() === '') {
                    return {};
                }
                
                const parsedConfig = JSON.parse(content) as ConfigObject;
                return parsedConfig || {};
            } catch (e) {
                logging.error(`Failed to read configuration: ${e instanceof Error ? e.message : String(e)}`);
                return {};
            }
        });
    }

    /**
     * 写入配置到文件
     * @param config 要写入的配置对象
     * @param retryOptions 重试选项
     * @returns 保存操作的结果
     */
    private async writeConfig(
        config: ConfigObject,
        retryOptions?: {
            retryOnConnectivityError?: boolean;
            retryInterval?: number;
            maxRetries?: number;
        }
    ): Promise<boolean> {
        // 在发布服务下不进行写入
        if (isPublish()) {
            logging.error('Writing configuration is not supported in publish service');
            return false;
        }
        // 将写入操作添加到队列
        return FileOperationQueue.enqueue(this.configPath, async () => {
            try {
                const result = await putFile(
                    this.configPath,
                    {
                        isDir: false,
                        modTime: Math.floor(Date.now() / 1000),
                        file: new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }),
                        ...retryOptions
                    }
                );
                
                if (result.code === 0) {
                    return true;
                } else {
                    logging.error(`Failed to save configuration: ${result.msg}`);
                    return false;
                }
            } catch (e) {
                logging.error(`Save configuration exception: ${e instanceof Error ? e.message : String(e)}`);
                return false;
            }
        });
    }

    /**
     * 获取配置项的值，调用时必须使用 await
     * @param path 配置项的路径，使用点表示法访问嵌套属性，如 "user.preferences.theme"
     * @param defaultValue 默认值，当配置项不存在时返回
     * @param retryOptions 重试选项
     * @returns 配置项的值或默认值
     */
    async get<T>(
        path: string, 
        defaultValue?: T,
        retryOptions?: {
            retryOnConnectivityError?: boolean;
            retryInterval?: number;
            maxRetries?: number;
        }
    ): Promise<T | undefined> {
        try {
            // 确保初始化完成
            await this.initPromise;
            
            const config = await this.readConfig(retryOptions);
            
            // 使用点表示法访问嵌套属性
            const value = path.split('.').reduce((obj: unknown, key: string) => {
                return obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined;
            }, config);
            
            return value !== undefined ? value as unknown as T : defaultValue;
        } catch (e) {
            logging.error(`Error getting config value at path '${path}': ${e instanceof Error ? e.message : String(e)}`);
            return defaultValue;
        }
    }

    /**
     * 设置配置项的值，调用时必须使用 await
     * @param path 配置项的路径，使用点表示法访问嵌套属性，如 "user.preferences.theme"
     * @param value 要设置的值
     * @param retryOptions 重试选项
     * @returns 是否成功设置并保存
     */
    async set<T extends ConfigValue>(
        path: string, 
        value: T,
        retryOptions?: {
            retryOnConnectivityError?: boolean;
            retryInterval?: number;
            maxRetries?: number;
        }
    ): Promise<boolean> {
        try {
            // 确保初始化完成
            await this.initPromise;
            
            const config = await this.readConfig(retryOptions);
            const keys = path.split('.');
            
            // 处理嵌套路径
            let current = config;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
                    current[key] = {};
                }
                current = current[key] as ConfigObject;
            }
            
            // 设置最终值
            const lastKey = keys[keys.length - 1];
            current[lastKey] = value;
            
            return await this.writeConfig(config, retryOptions);
        } catch (e) {
            logging.error(`Error setting config value at path '${path}': ${e instanceof Error ? e.message : String(e)}`);
            return false;
        }
    }

    /**
     * 批量更新配置
     * @param updates 要更新的配置项键值对，键可以是点表示法的嵌套路径
     * @param retryOptions 重试选项
     * @returns 是否成功设置并保存
     */
    async batchUpdate(
        updates: Record<string, ConfigValue>,
        retryOptions?: {
            retryOnConnectivityError?: boolean;
            retryInterval?: number;
            maxRetries?: number;
        }
    ): Promise<boolean> {
        try {
            // 确保初始化完成
            await this.initPromise;
            
            const config = await this.readConfig(retryOptions);
            
            // 逐个应用更新
            for (const [path, value] of Object.entries(updates)) {
                const keys = path.split('.');
                
                let current = config;
                for (let i = 0; i < keys.length - 1; i++) {
                    const key = keys[i];
                    if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
                        current[key] = {};
                    }
                    current = current[key] as ConfigObject;
                }
                
                const lastKey = keys[keys.length - 1];
                current[lastKey] = value;
            }
            
            return await this.writeConfig(config, retryOptions);
        } catch (e) {
            logging.error(`Error during batch update: ${e instanceof Error ? e.message : String(e)}`);
            return false;
        }
    }

    /**
     * 重置所有配置为默认值
     * @param retryOptions 重试选项
     * @returns 是否成功重置并保存
     */
    async resetConfig(
        retryOptions?: {
            retryOnConnectivityError?: boolean;
            retryInterval?: number;
            maxRetries?: number;
        }
    ): Promise<boolean> {
        logging.info('Reset configuration to default values');
        return await this.writeConfig({...this.defaultConfig}, retryOptions);
    }

    /**
     * 获取所有配置
     * @param retryOptions 重试选项
     * @returns 所有配置项
     */
    async getAll(
        retryOptions?: {
            retryOnConnectivityError?: boolean;
            retryInterval?: number;
            maxRetries?: number;
        }
    ): Promise<ConfigObject> {
        // 确保初始化完成
        await this.initPromise;
        return await this.readConfig(retryOptions);
    }

    /**
     * 删除配置项，支持点表示法的嵌套路径
     * @param path 要删除的配置项的路径，使用点表示法访问嵌套属性
     * @param retryOptions 重试选项
     * @returns 是否成功删除并保存
     */
    async remove(
        path: string,
        retryOptions?: {
            retryOnConnectivityError?: boolean;
            retryInterval?: number;
            maxRetries?: number;
        }
    ): Promise<boolean> {
        try {
            // 确保初始化完成
            await this.initPromise;
            
            const config = await this.readConfig(retryOptions);
            const keys = path.split('.');
            
            let current = config;
            const lastIndex = keys.length - 1;
            
            // 遍历路径，确保中间节点都存在
            for (let i = 0; i < lastIndex; i++) {
                const segment = keys[i];
                
                // 如果路径中的某个节点不存在，则无法删除
                if (current[segment] === undefined || current[segment] === null || typeof current[segment] !== 'object') {
                    return true; // 节点不存在，视为删除成功
                }
                
                current = current[segment] as ConfigObject;
            }
            
            // 删除最终值
            const lastSegment = keys[lastIndex];
            if (current[lastSegment] !== undefined) {
                delete current[lastSegment];
                return await this.writeConfig(config, retryOptions);
            }
            
            return true; // 要删除的键不存在，视为删除成功
        } catch (e) {
            logging.error(`Error removing config value at path '${path}': ${e instanceof Error ? e.message : String(e)}`);
            return false;
        }
    }
}