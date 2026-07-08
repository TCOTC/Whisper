import { ThemeModule, TargetConfig } from '../types';
import { logging } from './logger';
import { getCurrentTheme } from './themeSwitch';
import { waitForElement } from './utils';

/**
 * 元素状态观察器：监听元素状态，通过给 html 添加属性来代替使用 :has 选择器
 */
export class ElementStatusObserver implements ThemeModule {
    private elementObserver: MutationObserver | null = null;
    private targets: TargetConfig[] = [];
    private destroyed = false;

    /**
     * 初始化元素状态观察器
     */
    public async init(): Promise<void> {
        this.setupTargets();
        await this.startObserving();
    }

    /**
     * 销毁元素状态观察器
     */
    public destroy(): void {
        this.destroyed = true;

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
        ];
    }

    /**
     * 开始观察元素状态
     */
    private async startObserving(): Promise<void> {
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

        await Promise.all(this.targets.map(target => this.waitForTarget(target)));
    }

    /**
     * 等待并观察单个目标节点
     */
    private async waitForTarget(target: TargetConfig): Promise<void> {
        const element = await waitForElement(
            target.selector,
            () => this.shouldExcludeTarget(target),
        );

        if (this.destroyed) return;

        if (!element) {
            target.timedOut = true;
            if (!this.shouldExcludeTarget(target)) {
                logging.error(`failed to find target node: ${target.selector}`);
            }
            return;
        }

        target.element = element;
        target.found = true;
        this.setupObserver(target);
    }

    /**
     * 检查是否应排除该目标
     */
    private shouldExcludeTarget(target: TargetConfig): boolean {
        if (!target.exclude) return false;

        const excludeElement = document.querySelector(target.exclude.selector);
        if (!excludeElement) return false;

        return target.exclude.check
            ? target.exclude.check(excludeElement as HTMLElement)
            : true;
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