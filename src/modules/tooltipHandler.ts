import { IEventBusMap } from 'siyuan';
import { ThemeModule } from '../types';
import { EventBusManager } from './eventBusManager';
import { isLocalPath } from './utils';
import { logging } from './logger';

/**
 * 悬浮提示处理器：通过事件总线 before-show-tooltip / before-hide-tooltip https://github.com/TCOTC/Whisper/issues/15
 * 给 tooltip 添加 data-whisper-tooltip，供样式区分
 */
export class TooltipHandler implements ThemeModule {
    private tooltipElement: HTMLElement | null = null;

    constructor(private readonly eventBusManager: EventBusManager) {}

    private getTooltipElement(): void {
        if (!this.tooltipElement) {
            this.tooltipElement = document.getElementById('tooltip');
        }
    }

    /**
     * 初始化悬浮提示处理器
     */
    public init(): void {
        this.getTooltipElement();
        if (!this.tooltipElement) {
            logging.error('tooltip element does not exist.');
        }

        this.eventBusManager.on('before-show-tooltip', this.onBeforeShowTooltip);
        this.eventBusManager.on('before-hide-tooltip', this.onBeforeHideTooltip);
    }

    /**
     * 销毁悬浮提示处理器
     */
    public destroy(): void {
        this.eventBusManager.off('before-show-tooltip', this.onBeforeShowTooltip);
        this.eventBusManager.off('before-hide-tooltip', this.onBeforeHideTooltip);

        this.getTooltipElement();
        this.tooltipElement?.removeAttribute('data-whisper-tooltip');
        this.tooltipElement = null;
    }

    /**
     * tooltip 即将显示：按触发元素写入属性
     */
    private onBeforeShowTooltip = (event: CustomEvent<IEventBusMap['before-show-tooltip']>): void => {
        const { target, tooltipElement } = event.detail ?? {};
        if (tooltipElement instanceof HTMLElement) {
            this.tooltipElement = tooltipElement;
        } else {
            this.getTooltipElement();
        }

        if (!(target instanceof HTMLElement) || !this.tooltipElement) {
            return;
        }

        this.setTooltipData(this.classifyTooltip(target));
    };

    /**
     * tooltip 即将隐藏：左下角提示需保留 data-whisper-tooltip，供 CSS 淡出
     */
    private onBeforeHideTooltip = (event: CustomEvent<IEventBusMap['before-hide-tooltip']>): void => {
        const { tooltipElement } = event.detail ?? {};
        if (tooltipElement instanceof HTMLElement) {
            this.tooltipElement = tooltipElement;
        }
        // 不在此处清空属性：href / tab_header 的淡出依赖属性仍在
    };

    /**
     * 根据触发元素判断 tooltip 类型
     */
    private classifyTooltip(e: HTMLElement): string {
        // 按照触发频率排序

        // 文本超链接
        const href = e.getAttribute('data-href');
        if (href) {
            // 资源文件链接
            if (isLocalPath(href)) {
                return 'href_asset';
            }
            // 普通链接
            return 'href';
        }

        // 页签
        if (e.closest('[data-type="tab-header"]')) {
            return 'tab_header';
        }

        // 数据库
        if (
            e.closest('[data-av-id]') || // 数据库块、属性面板数据库选项卡
            e.closest('.av__panel')      // 数据库菜单：选项描述、资源字段条目
        ) {
            return 'av';
        }

        // 表情选择器上的表情、底部选项
        if (e.classList.contains('emojis__item') || e.classList.contains('emojis__type')) {
            return 'emoji';
        }

        // 块备注（角标）https://github.com/siyuan-note/siyuan/pull/16025
        if (e.closest('.protyle-attr--memo')) {
            return 'block_memo';
        }

        return '';
    }

    /**
     * 设置悬浮提示属性
     */
    private setTooltipData(data: string): void {
        if (!this.tooltipElement) return;
        
        if (this.tooltipElement.dataset?.whisperTooltip !== data) {
            this.tooltipElement.dataset.whisperTooltip = data;
        }
    }
}
