import { ThemeModule } from '../types';
import { logging } from './logger';
import { waitForElement } from './utils';

/**
 * 点击文档树空白处，取消选中文档或笔记本
 * 
 * // TODO跟进 可能需要修改原生机制 https://github.com/siyuan-note/siyuan/issues/14858
 */
export class FileTreeClickHandler implements ThemeModule {
    private syFileElement: HTMLElement | null = null;

    public async init(): Promise<void> {
        if (document.body.classList.contains('body--window')) {
            // 新窗口没有文档树
            return;
        }

        const syFileElement = await waitForElement('.sy__file');
        if (!syFileElement) {
            logging.warn('Max retries reached. Could not find .sy__file element.');
            return;
        }

        this.syFileElement = syFileElement;
        this.syFileElement.addEventListener('click', this.handleClick, true);
    }

    public destroy(): void {
        this.syFileElement?.removeEventListener('click', this.handleClick, true);
        this.syFileElement = null;
    }

    /**
     * 处理 .sy__file 元素的点击事件
     */
    private handleClick = (event: MouseEvent): void => {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        // 按下修饰键时忽略处理。比如多选笔记本可以拖拽排序，所以不能完全禁止选中笔记本
        if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
            return;
        }

        const notebook = target.closest('.b3-list-item[data-type="navigation-root"]') as HTMLElement | null;
        if (!notebook && target.closest('.block__icon:not([data-type="collapse"]), .b3-list, .b3-list-item__toggle')) {
            // 点击非折叠按钮或文档区域时跳过
            return;
        }

        // 解决点击笔记本时 b3-list-item--focus 类名闪现造成的背景色闪烁
        let styleBgColor: string | undefined;
        if (notebook) {
            styleBgColor = notebook.style.backgroundColor; // 如果原来就有内联背景色，则保存下来之后恢复
            const bgColor = window.getComputedStyle(notebook).backgroundColor; // 正常情况下没有内联背景色
            notebook.style.backgroundColor = bgColor;
        }

        // 等思源原生的监听器处理完点击事件之后再操作
        setTimeout(() => {
            if (notebook) {
                notebook.style.backgroundColor = styleBgColor ? styleBgColor : '';
            }

            // 去掉 .sy__file 下的所有 .b3-list-item--focus 类名，取消选中所有笔记本和文档
            this.syFileElement?.querySelectorAll('.b3-list-item--focus')?.forEach(item => {
                item.classList.remove('b3-list-item--focus');
            });
        });
    };
}
