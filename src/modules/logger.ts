/**
 * 日志工具模块
 * 提供带自定义前缀的日志输出功能
 */

/**
 * 日志类
 * 提供带前缀的日志输出方法
 */
export class Logger {
    private prefix: string;

    /**
     * 创建一个日志记录器
     * @param prefix 日志前缀
     */
    constructor(prefix: string = 'Whisper') {
        this.prefix = prefix;
    }

    /**
     * 输出普通日志
     * @param args 要输出的内容
     */
    log(...args: any[]): void {
        console.log(`[${this.prefix}]`, ...args);
    }

    /**
     * 输出错误日志
     * @param args 要输出的内容
     */
    error(...args: any[]): void {
        console.error(`[${this.prefix}]`, ...args);
    }

    /**
     * 输出警告日志
     * @param args 要输出的内容
     */
    warn(...args: any[]): void {
        console.warn(`[${this.prefix}]`, ...args);
    }

    /**
     * 输出信息日志
     * @param args 要输出的内容
     */
    info(...args: any[]): void {
        console.info(`[${this.prefix}]`, ...args);
    }

    /**
     * 输出调试日志
     * @param args 要输出的内容
     */
    debug(...args: any[]): void {
        console.debug(`[${this.prefix}]`, ...args);
    }

    /**
     * 更改日志前缀
     * @param prefix 新的前缀
     */
    setPrefix(prefix: string): void {
        this.prefix = prefix;
    }
}

// /**
//  * 创建默认的日志记录器实例
//  */
// export const logger = new Logger('Whisper');

/**
 * 创建自定义前缀的日志记录器
 * @param prefix 自定义前缀
 * @returns 日志记录器实例
 */
export function createLogger(prefix: string): Logger {
    return new Logger(prefix);
}

/**
 * 保存原始的console方法
 */
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
};

/**
 * 覆盖全局console对象
 * @param prefix 日志前缀
 */
export function overrideConsole(prefix: string = 'Whisper'): void {
    console.log = function(...args: any[]): void {
        originalConsole.log(`[${prefix}]`, ...args);
    };
    
    console.error = function(...args: any[]): void {
        originalConsole.error(`[${prefix}]`, ...args);
    };
    
    console.warn = function(...args: any[]): void {
        originalConsole.warn(`[${prefix}]`, ...args);
    };
    
    console.info = function(...args: any[]): void {
        originalConsole.info(`[${prefix}]`, ...args);
    };
    
    console.debug = function(...args: any[]): void {
        originalConsole.debug(`[${prefix}]`, ...args);
    };
}

/**
 * 恢复原始的console对象
 */
export function restoreConsole(): void {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
} 