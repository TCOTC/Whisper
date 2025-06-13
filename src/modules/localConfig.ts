import { themeLogger } from './logger';
import { getFile, putFile } from './utils';

/**
 * 文件操作队列管理器，用于确保文件操作的顺序执行
 */
class FileOperationQueue {
    // 使用静态 Map 存储每个文件路径对应的操作队列
    private static queues: Map<string, Promise<any>> = new Map();

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
            themeLogger.error(`Operation error for ${filePath}:`, error);
            throw error; // 重新抛出错误给调用者
        });
    }
}

/**
 * 本地配置，不参与同步
 */
export class LocalConfig {
    private configPath: string; // 配置文件路径，相对于工作空间根目录

    /**
     * 构造函数
     * @param configPath 配置文件路径，相对于工作空间根目录
     */
    constructor(configPath: string = '/conf/whisper-theme-config.json') {
        if (configPath) {
            this.configPath = configPath;
        }
    }

    /**
     * 初始化配置
     */
    async init() {
        const config = await this.readConfig();
        if (!config.version) {
            config.version = 1;
            await this.writeConfig(config);
        }
    }

    /**
     * 销毁实例，清理资源
     * 当不再需要使用此配置实例时调用
     */
    async destroy(): Promise<void> {
        // 确保所有待处理的文件操作都已完成
        await FileOperationQueue.enqueue(this.configPath, async () => {
            // 空操作，仅用于确保之前的所有操作都已完成
            return Promise.resolve();
        });
    }

    /**
     * 读取配置文件内容
     * @returns 配置对象，如果读取失败则返回空对象
     */
    private async readConfig(): Promise<Record<string, any>> {
        // 将读取操作添加到队列
        return FileOperationQueue.enqueue(this.configPath, async () => {
            try {
                const content = await getFile(this.configPath);
                
                // 如果文件不存在或出错，返回空对象
                if (typeof content !== 'string') {
                    return {};
                }
                
                return JSON.parse(content);
            } catch (e) {
                themeLogger.error(`Failed to read configuration: ${e instanceof Error ? e.message : String(e)}`);
                return {};
            }
        });
    }

    /**
     * 写入配置到文件
     * @param config 要写入的配置对象
     * @returns 保存操作的结果
     */
    private async writeConfig(config: Record<string, any>): Promise<boolean> {
        // 将写入操作添加到队列
        return FileOperationQueue.enqueue(this.configPath, async () => {
            try {
                const result = await putFile(
                    this.configPath,
                    {
                        isDir: false,
                        modTime: Math.floor(Date.now() / 1000),
                        file: new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
                    }
                );
                
                if (result.code === 0) {
                    return true;
                } else {
                    themeLogger.error(`Failed to save configuration: ${result.msg}`);
                    return false;
                }
            } catch (e) {
                themeLogger.error(`Save configuration exception: ${e instanceof Error ? e.message : String(e)}`);
                return false;
            }
        });
    }

    /**
     * 解析路径，支持嵌套属性访问，如 'time.["2025-06-13"]' 或 'user.preferences.theme'
     * @param path 配置路径，可以是简单键名或嵌套路径
     * @returns 解析后的路径数组
     */
    private parsePath(path: string): string[] {
        // 处理特殊格式如 'time["2025-06-13"]'，将其转换为 ['time', '2025-06-13']
        // 支持两种格式: time["key"] 和 time.["key"]
        const bracketPattern = /(\w+)(?:\.|)(?:\[(["'])(.+?)\2\])/g;
        let normalizedPath = path;
        let match;
        
        // 收集所有匹配项
        const matches: {original: string, replacement: string}[] = [];
        while ((match = bracketPattern.exec(path)) !== null) {
            const original = match[0];
            const prefix = match[1];
            const key = match[3];
            matches.push({
                original,
                replacement: `${prefix}.${key}`
            });
        }
        
        // 从后向前替换，避免替换位置变化
        for (let i = matches.length - 1; i >= 0; i--) {
            const { original, replacement } = matches[i];
            normalizedPath = normalizedPath.replace(original, replacement);
        }
        
        // 处理普通的点分隔路径
        return normalizedPath.split('.').filter(segment => segment.length > 0);
    }

    /**
     * 根据路径获取配置对象中的值
     * @param obj 配置对象
     * @param pathSegments 路径段数组
     * @param defaultValue 默认值
     * @returns 找到的值或默认值
     */
    private getValueByPath(obj: Record<string, any>, pathSegments: string[], defaultValue?: any): any {
        let current = obj;
        
        for (const segment of pathSegments) {
            // 如果当前对象不存在或不是对象类型，无法继续访问
            if (current === undefined || current === null || typeof current !== 'object') {
                return defaultValue;
            }
            
            current = current[segment];
        }
        
        return current !== undefined ? current : defaultValue;
    }

    /**
     * 根据路径设置配置对象中的值
     * @param obj 配置对象
     * @param pathSegments 路径段数组
     * @param value 要设置的值
     */
    private setValueByPath(obj: Record<string, any>, pathSegments: string[], value: any): void {
        if (pathSegments.length === 0) {
            return;
        }
        
        let current = obj;
        const lastIndex = pathSegments.length - 1;
        
        // 遍历路径，确保中间节点都存在
        for (let i = 0; i < lastIndex; i++) {
            const segment = pathSegments[i];
            
            // 如果下一级不存在或不是对象，则创建一个空对象
            if (current[segment] === undefined || current[segment] === null || typeof current[segment] !== 'object') {
                current[segment] = {};
            }
            
            current = current[segment];
        }
        
        // 设置最终值
        current[pathSegments[lastIndex]] = value;
    }

    /**
     * 根据路径删除配置对象中的值
     * @param obj 配置对象
     * @param pathSegments 路径段数组
     * @returns 是否成功删除
     */
    private removeValueByPath(obj: Record<string, any>, pathSegments: string[]): boolean {
        if (pathSegments.length === 0) {
            return false;
        }
        
        let current = obj;
        const lastIndex = pathSegments.length - 1;
        
        // 遍历路径，确保中间节点都存在
        for (let i = 0; i < lastIndex; i++) {
            const segment = pathSegments[i];
            
            // 如果路径中的某个节点不存在，则无法删除
            if (current[segment] === undefined || current[segment] === null || typeof current[segment] !== 'object') {
                return false;
            }
            
            current = current[segment];
        }
        
        // 删除最终值
        const lastSegment = pathSegments[lastIndex];
        if (current[lastSegment] !== undefined) {
            delete current[lastSegment];
            return true;
        }
        
        return false;
    }

    /**
     * 获取配置项的值，支持嵌套路径
     * @param path 配置项的路径，可以是简单键名或嵌套路径，如 'time.["2025-06-13"]' 或 'user.preferences.theme'
     * @param defaultValue 默认值，当配置项不存在时返回
     * @returns 配置项的值或默认值
     */
    async get<T>(path: string, defaultValue?: T): Promise<T> {
        const config = await this.readConfig();
        const pathSegments = this.parsePath(path);
        
        // 如果是简单路径，直接访问
        if (pathSegments.length === 1) {
            return (config[pathSegments[0]] !== undefined) ? config[pathSegments[0]] : defaultValue;
        }
        
        // 处理嵌套路径
        return this.getValueByPath(config, pathSegments, defaultValue);
    }

    /**
     * 设置配置项的值，支持嵌套路径，调用时必须使用 await
     * @param path 配置项的路径，可以是简单键名或嵌套路径，如 'time.["2025-06-13"]' 或 'user.preferences.theme'
     * @param value 要设置的值
     * @returns 是否成功设置并保存
     */
    async set<T>(path: string, value: T): Promise<boolean> {
        const config = await this.readConfig();
        const pathSegments = this.parsePath(path);
        
        // 如果是简单路径，直接设置
        if (pathSegments.length === 1) {
            config[pathSegments[0]] = value;
        } else {
            // 处理嵌套路径
            this.setValueByPath(config, pathSegments, value);
        }
        
        return await this.writeConfig(config);
    }

    /**
     * 批量更新配置，支持嵌套路径，调用时必须使用 await
     * @param updates 要更新的配置项键值对，键可以是嵌套路径
     * @returns 是否成功设置并保存
     */
    async batchUpdate(updates: Record<string, any>): Promise<boolean> {
        const config = await this.readConfig();
        
        Object.entries(updates).forEach(([path, value]) => {
            const pathSegments = this.parsePath(path);
            
            // 如果是简单路径，直接设置
            if (pathSegments.length === 1) {
                config[pathSegments[0]] = value;
            } else {
                // 处理嵌套路径
                this.setValueByPath(config, pathSegments, value);
            }
        });
        
        return await this.writeConfig(config);
    }

    // /**
    //  * 删除配置项，支持嵌套路径
    //  * @param path 要删除的配置项的路径，可以是简单键名或嵌套路径
    //  * @returns 是否成功删除并保存
    //  */
    // async remove(path: string): Promise<boolean> {
    //     const config = await this.readConfig();
    //     const pathSegments = this.parsePath(path);
        
    //     let modified = false;
        
    //     // 如果是简单路径，直接删除
    //     if (pathSegments.length === 1) {
    //         if (config[pathSegments[0]] !== undefined) {
    //             delete config[pathSegments[0]];
    //             modified = true;
    //         }
    //     } else {
    //         // 处理嵌套路径
    //         modified = this.removeValueByPath(config, pathSegments);
    //     }
        
    //     return modified ? await this.writeConfig(config) : true;
    // }

    // /**
    //  * 获取所有配置
    //  * @returns 所有配置项
    //  */
    // async getAll(): Promise<Record<string, any>> {
    //     return await this.readConfig();
    // }

    // /**
    //  * 重置所有配置
    //  * @param defaultConfig 默认配置，可选
    //  * @returns 是否成功重置并保存
    //  */
    // async resetConfig(defaultConfig: Record<string, any> = {}): Promise<boolean> {
    //     return await this.writeConfig(defaultConfig);
    // }
}