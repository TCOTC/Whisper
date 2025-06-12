import { ThemeModule, TargetConfig } from '../types';
import { isMobile } from './utils';

export class ElementStatusObserver implements ThemeModule {
    private retryIntervalId: number | null = null;
    private elementObserver: MutationObserver | null = null;
    private targets: TargetConfig[] = [];
    private addedAttributes: Set<string> = new Set(); // 跟踪添加的属性

    /**
     * 初始化元素状态观察器
     */
    public init(): void {
        if (isMobile()) return;
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
            // 留 3 秒是为了确保主题在明亮和暗黑模式之间切换之后，依赖这些属性的样式不变
            const mode = document.documentElement.getAttribute("data-theme-mode");
            const lightTheme = document.documentElement.getAttribute("data-light-theme");
            const darkTheme = document.documentElement.getAttribute("data-dark-theme");
            
            if ((mode === "light" && lightTheme !== "Whisper") || (mode === "dark" && darkTheme !== "Whisper")) {
                // 移除所有已添加的属性
                this.addedAttributes.forEach(attr => {
                    document.documentElement.removeAttribute(attr);
                });
                this.addedAttributes.clear();
            }
        }, 3000);
    }

    /**
     * 创建基础目标配置
     */
    private createBaseTarget(selector: string, checks: TargetConfig['checks']): TargetConfig {
        return {
            selector,
            checks,
            found: false,
            timedOut: false,
            element: null
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
            ]),
            this.createBaseTarget('#dockRight', [
                {
                    datasetProp: 'whisperDockRight',
                    attributeFilter: 'class',
                    check: el => el.classList.contains('fn__none'),
                    stateMap: { true: 'hide', false: 'show' }
                }
            ]),
            this.createBaseTarget('#dockBottom', [
                {
                    datasetProp: 'whisperDockBottom',
                    attributeFilter: 'class',
                    check: el => el.classList.contains('fn__none'),
                    stateMap: { true: 'hide', false: 'show' }
                }
            ]),
            this.createBaseTarget('.layout__dockl', [
                {
                    datasetProp: 'whisperLayoutDockl',
                    attributeFilter: 'style',
                    check: el => el.style.width === '0px',
                    stateMap: { true: 'hide', false: 'show' }
                },
                {
                    datasetProp: 'whisperLayoutDocklFloat',
                    attributeFilter: 'class',
                    check: el => el.classList.contains('layout--float'),
                    stateMap: { true: 'float', false: 'pin' }
                }
            ]),
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
            ])
        ];
    }

    /**
     * 开始观察元素状态
     */
    private startObserving(): void {
        // 如果所有目标节点都已存在对应 dataset 属性则直接返回
        if (this.targets.every(target => target.found)) return;

        // 创建一个 MutationObserver 实例来观察所有目标节点的变化
        this.elementObserver = new MutationObserver(mutationsList => {
            for (let mutation of mutationsList) {
                const targetNode = mutation.target as HTMLElement;
                // 找出对应的目标节点配置
                const target = this.targets.find(t => t.element === targetNode);
                if (!target) continue;

                // 更新所有相关的 dataset 属性
                target.checks.forEach(check => {
                    if (check.attributeFilter === mutation.attributeName) {
                        const checkResult = check.check(targetNode);
                        document.documentElement.dataset[check.datasetProp] = check.stateMap[String(checkResult)];
                        const attributeName = `data-${check.datasetProp.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                        this.addedAttributes.add(attributeName); // 记录添加的属性名
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
                    console.error(`Whisper: failed to find target node: ${target.selector}`);
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
        // 立即执行一次查找
        findTargetNodes();
    }

    /**
     * 设置单个目标节点的观察
     */
    private setupObserver(target: TargetConfig): void {
        if (!target.element || !this.elementObserver) return;

        // 初始设置所有 dataset 状态
        target.checks.forEach(check => {
            const checkResult = check.check(target.element!);
            const attributeName = `data-${check.datasetProp.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            document.documentElement.dataset[check.datasetProp] = check.stateMap[String(checkResult)];
            this.addedAttributes.add(attributeName); // 记录添加的属性名
        });

        // 开始观察该节点的所有相关属性变化
        const attributesToObserve = [...new Set(target.checks.map(check => check.attributeFilter))];
        this.elementObserver.observe(target.element, { 
            attributes: true,
            attributeFilter: attributesToObserve
        });
    }
} 