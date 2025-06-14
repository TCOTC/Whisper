import { ThemeModule, TargetConfig } from '../types';
import { logging } from './logger';
import { getCurrentTheme } from './utils';

/**
 * 元素状态观察器：监听元素状态，通过给 html 添加属性来代替使用 :has 选择器
 */
export class ElementStatusObserver implements ThemeModule {
    private retryIntervalId: number | null = null;
    private elementObserver: MutationObserver | null = null;
    private targets: TargetConfig[] = [];

    /**
     * 初始化元素状态观察器
     */
    public init(): void {
        this.setupTargets();
        this.startObserving();
    }

    /**
     * 销毁元素状态观察器
     */
    public destroy(): void {
        if (this.retryIntervalId) {
            clearInterval(this.retryIntervalId);
            this.retryIntervalId = null;
        }
        
        if (this.elementObserver) {
            this.elementObserver.disconnect();
            this.elementObserver = null;
        }
        
        setTimeout(() => {
            // 3 秒后检查当前主题是否为 Whisper，如果不是则移除主题添加的属性
            // 留 3 秒是为了让主题在明亮和暗黑模式之间切换之后的一段时间内，依赖这些属性的样式不变
            if (getCurrentTheme() !== 'Whisper') {
                // 移除所有已添加的属性（从 found 为 true 的 targets 中获取）
                this.targets.forEach(target => {
                    if (target.found) {
                        target.checks.forEach(check => {
                            const attributeName = `data-${check.datasetProp.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                            document.documentElement.removeAttribute(attributeName);
                        });
                    }
                });
            }
        }, 3000);
    }

    /**
     * 创建基础目标配置
     * @param selector 目标元素选择器
     * @param checks 检查配置数组
     * @param exclude 排除配置，如果存在符合该选择器的元素，则忽略该目标
     */
    private createBaseTarget(
        selector: string, 
        checks: TargetConfig['checks'], 
        exclude?: TargetConfig['exclude']
    ): TargetConfig {
        return {
            selector,
            checks,
            found: false,
            timedOut: false,
            element: null,
            exclude
        };
    }

    /**
     * 设置目标元素配置
     */
    private setupTargets(): void {
        this.targets = [
            this.createBaseTarget('#status', [
                {
                    datasetProp: 'whisperStatus',
                    attributeFilter: 'class',
                    check: el => el.classList.contains('fn__none'),
                    stateMap: { true: 'hide', false: 'show' }
                }
            ]),
            this.createBaseTarget('#dockLeft', [
                {
                    datasetProp: 'whisperDockLeft',
                    attributeFilter: 'class',
                    check: el => el.classList.contains('fn__none'),
                    stateMap: { true: 'hide', false: 'show' }
                }
            ], {
                selector: 'body.body--window'
            }),
            this.createBaseTarget('#dockRight', [
                {
                    datasetProp: 'whisperDockRight',
                    attributeFilter: 'class',
                    check: el => el.classList.contains('fn__none'),
                    stateMap: { true: 'hide', false: 'show' }
                }
            ], {
                selector: 'body.body--window'
            }),
            this.createBaseTarget('#dockBottom', [
                {
                    datasetProp: 'whisperDockBottom',
                    attributeFilter: 'class',
                    check: el => el.classList.contains('fn__none'),
                    stateMap: { true: 'hide', false: 'show' }
                }
            ], {
                selector: 'body.body--window'
            }),
            this.createBaseTarget('.layout__dockl', [
                {
                    datasetProp: 'whisperLayoutDockl',
                    attributeFilter: 'style',
                    check: el => el.style.width === '0px',
                    // TODO跟进 新版如果合并了 PR https://github.com/siyuan-note/siyuan/pull/15011 ，就改成：
                    // attributeFilter: 'class',
                    // check: el => el.classList.contains('fn__none'),
                    // 后面的 .layout__dockr 也一样
                    stateMap: { true: 'hide', false: 'show' }
                },
                {
                    datasetProp: 'whisperLayoutDocklFloat',
                    attributeFilter: 'class',
                    check: el => el.classList.contains('layout--float'),
                    stateMap: { true: 'float', false: 'pin' }
                }
            ], {
                selector: 'body.body--window'
            }),
            this.createBaseTarget('.layout__dockr', [
                {
                    datasetProp: 'whisperLayoutDockr',
                    attributeFilter: 'style',
                    check: el => el.style.width === '0px',
                    stateMap: { true: 'hide', false: 'show' }
                },
                {
                    datasetProp: 'whisperLayoutDockrFloat',
                    attributeFilter: 'class',
                    check: el => el.classList.contains('layout--float'),
                    stateMap: { true: 'float', false: 'pin' }
                }
            ], {
                selector: 'body.body--window'
            })
        ];
    }

    /**
     * 开始观察元素状态
     */
    private startObserving(): void {
        // 创建一个 MutationObserver 实例来观察所有目标节点的变化
        this.elementObserver = new MutationObserver(mutationsList => {
            for (const mutation of mutationsList) {
                const targetNode = mutation.target as HTMLElement;
                // 找出对应的目标节点配置
                const target = this.targets.find(t => t.element === targetNode);
                if (!target) continue;

                // 更新所有相关的 dataset 属性
                target.checks.forEach(check => {
                    if (check.attributeFilter === mutation.attributeName) {
                        const checkResult = check.check(targetNode);
                        document.documentElement.dataset[check.datasetProp] = check.stateMap[String(checkResult)];
                    }
                });
            }
        });

        // 重试机制配置
        const retryInterval = 100; // 重试间隔时间，单位：毫秒
        const maxRetries = 50; // 最大重试次数
        let retryCount = 0;

        // 重试查找目标节点
        const findTargetNodes = () => {
            retryCount++;
            let hasRemainingTargets = false;

            this.targets.forEach(target => {
                // 如果已经找到或已超时，跳过
                if (target.found || target.timedOut) return;

                // 先检查是否应该排除该目标
                let shouldExclude = false;
                if (target.exclude) {
                    const excludeElement = document.querySelector(target.exclude.selector);
                    if (excludeElement) {
                        shouldExclude = target.exclude.check 
                            ? target.exclude.check(excludeElement as HTMLElement)
                            : true;
                    }
                }
                if (shouldExclude) {
                    // 如果应该排除，标记为已超时并跳过
                    target.timedOut = true;
                    return;
                }

                // 查找目标节点
                const element = document.querySelector(target.selector) as HTMLElement | null;
                if (element) {
                    // 找到该节点
                    target.element = element;
                    target.found = true;
                    this.setupObserver(target); // 设置观察和初始状态
                } else if (retryCount >= maxRetries) {
                    // 达到最大重试次数仍未找到
                    target.timedOut = true;
                    logging.error(`failed to find target node: ${target.selector}`);
                } else {
                    // 继续重试
                    hasRemainingTargets = true;
                }
            });

            // 如果所有节点都处理完毕或达到最大重试次数，停止定时器
            if (!hasRemainingTargets || retryCount >= maxRetries) {
                if (this.retryIntervalId) {
                    clearInterval(this.retryIntervalId);
                    this.retryIntervalId = null;
                }
            }
        };

        // 启动重试机制
        this.retryIntervalId = window.setInterval(findTargetNodes, retryInterval);
    }

    /**
     * 设置单个目标节点的观察
     */
    private setupObserver(target: TargetConfig): void {
        if (!target.element || !this.elementObserver) return;

        // 初始设置所有 dataset 状态
        target.checks.forEach(check => {
            const checkResult = check.check(target.element!);
            document.documentElement.dataset[check.datasetProp] = check.stateMap[String(checkResult)];
        });

        // 开始观察该节点的所有相关属性变化
        const attributesToObserve = Array.from(new Set(target.checks.map(check => check.attributeFilter)));
        this.elementObserver.observe(target.element, { 
            attributes: true,
            attributeFilter: attributesToObserve
        });
    }
} 