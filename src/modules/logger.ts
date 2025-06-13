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
    log(...args: unknown[]): void {
        console.log(`[${this.prefix}]`, ...args);
    }

    /**
     * 输出错误日志
     * @param args 要输出的内容
     */
    error(...args: unknown[]): void {
        console.error(`[${this.prefix}]`, ...args);
    }

    /**
     * 输出警告日志
     * @param args 要输出的内容
     */
    warn(...args: unknown[]): void {
        console.warn(`[${this.prefix}]`, ...args);
    }

    /**
     * 输出信息日志
     * @param args 要输出的内容
     */
    info(...args: unknown[]): void {
        console.info(`[${this.prefix}]`, ...args);
    }

    /**
     * 输出调试日志
     * @param args 要输出的内容
     */
    debug(...args: unknown[]): void {
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

// 创建主题专用的日志实例
export const themeLogger = new Logger();

/**
 * 设置主题日志前缀
 * @param prefix 日志前缀
 */
export function setThemeLoggerPrefix(prefix: string = 'Whisper'): void {
    themeLogger.setPrefix(prefix);
}