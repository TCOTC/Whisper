import { ThemeModule } from '../types';
import { isMobile, isLocalPath } from './utils';

export class TooltipHandler implements ThemeModule {
    private tooltipElement: HTMLElement | null = null;

    /**
     * 初始化工具提示处理器
     */
    public init(): void {
        if (isMobile()) return;
        this.setupTooltipObserver();
    }

    /**
     * 销毁工具提示处理器
     */
    public destroy(): void {
        document.removeEventListener('mouseover', this.updateTooltipData);
        
        if (this.tooltipElement) {
            this.tooltipElement.removeAttribute("data-whisper-tooltip");
            this.tooltipElement = null;
        }
    }

    /**
     * 设置工具提示观察器
     */
    private setupTooltipObserver(): void {
        this.tooltipElement = document.getElementById("tooltip");
        
        if (this.tooltipElement) {
            // 参考原生的 initBlockPopover 函数
            document.addEventListener('mouseover', this.updateTooltipData);
        } else {
            console.error("Whisper: tooltip element does not exist.");
        }
    }

    /**
     * 更新工具提示数据属性
     */
    private updateTooltipData = (event: MouseEvent): void => {
        if (!event.target || (event.target as Node).nodeType === 9) return;
        if (!this.tooltipElement) return;
        
        const e = (event.target as Node).nodeType === 3 
            ? (event.target as Text).parentElement as HTMLElement 
            : event.target as HTMLElement;

        // 按照触发频率排序

        // 文档树
        // TODO跟进 文档信息显示在左下角的问题还是没解决，估计是思源本体的问题：鼠标划过笔记本之后 tooltip 不隐藏 https://github.com/siyuan-note/siyuan/issues/14823
        //  到时候把这部分代码注释掉测试看看还会不会有问题
        const doc = e.closest('[data-type="navigation-file"]');
        if (doc) {
            this.removeTooltipData();
            return;
        }

        // 文本超链接
        const href = e.getAttribute("data-href");
        if (href) {
            // 资源文件链接
            if (isLocalPath(href)) {
                this.setTooltipData("href_asset");
                return;
            }
            // 普通链接
            this.setTooltipData("href", true);
            return;
        }

        // 页签
        if (e.closest('[data-type="tab-header"]')) {
            this.setTooltipData("tab_header", true);
            return;
        }

        // 数据库单元格、"添加"按钮、视图
        if (e.closest(".av__cell") ||
            e.closest('[data-type="av-add"]') || e.closest('[data-type="av-add-more"]') || e.closest('[data-type="av-header-add"]') ||
            e.closest('[data-page]')) {
            this.setTooltipData("av");
            return;
        }

        // 表情选择器上的表情、底部选项
        if (e.classList.contains("emojis__item") || e.classList.contains("emojis__type")) {
            this.setTooltipData("emoji");
            return;
        }

        // 如果正在显示的 tooltip 不属于特定元素，就将属性置空
        if (this.tooltipElement && !this.tooltipElement.classList.contains("fn__none")) {
            this.tooltipElement.dataset.whisperTooltip = "";
        }
    };

    /**
     * 设置工具提示数据属性
     */
    private setTooltipData(data: string, display: boolean = false): void {
        if (!this.tooltipElement) return;
        
        if (this.tooltipElement.dataset?.whisperTooltip !== data) {
            this.tooltipElement.dataset.whisperTooltip = data;
        }
        
        if (display) {
            // 设置 tooltip 元素的 display 属性
            // display:flex 用于普通链接和页签提示淡出。样式会被原生的 messageElement.removeAttribute("style"); 方法移除，不需要管理
            const tooltipStyle = this.tooltipElement.getAttribute('style') || '';
            this.tooltipElement.setAttribute('style', `${tooltipStyle} display: flex !important`);
        } else {
            this.tooltipElement.style.removeProperty('display');
        }
    }

    /**
     * 移除工具提示数据属性
     */
    private removeTooltipData(data?: string): void {
        if (!this.tooltipElement) return;
        
        if (!data || this.tooltipElement.dataset?.whisperTooltip === data) {
            this.tooltipElement.dataset.whisperTooltip = "";
        }
    }
} 