import { ThemeModule } from '../types';

export class BlockFocusHandler implements ThemeModule {
    /**
     * 初始化块焦点处理器
     */
    public init(): void {
        // 监听鼠标、键盘、拖拽、触屏操作结束后
        // 需要在捕获阶段触发，避免停止冒泡导致无法监听到
        document.addEventListener('mouseup', this.focusBlock, true);     // 鼠标抬起后
        document.addEventListener('keyup', this.focusBlock, true);       // 键盘按键松开后
        document.addEventListener('dragend', this.focusBlock, true);     // 拖拽(块)完成后
        document.addEventListener('touchend', this.focusBlock, true);    // 触屏操作结束后
        document.addEventListener('touchcancel', this.focusBlock, true); // 触屏操作取消后
    }

    /**
     * 销毁块焦点处理器
     */
    public destroy(): void {
        // 卸载事件监听器
        document.removeEventListener('mouseup', this.focusBlock, true);
        document.removeEventListener('keyup', this.focusBlock, true);
        document.removeEventListener('dragend', this.focusBlock, true);    
        document.removeEventListener('touchend', this.focusBlock, true);
        document.removeEventListener('touchcancel', this.focusBlock, true);

        // 移除添加的属性
        this.clearBlockFocusAttribute();
    }

    /**
     * 处理块焦点，给焦点所在块添加属性 data-whisper-block-focus，用于 CSS 选择器
     */
    private focusBlock = (event: MouseEvent | KeyboardEvent | DragEvent | TouchEvent): void => {
        // 获取活动编辑器
        let editor: HTMLElement | null = null;
        if (document.activeElement instanceof HTMLElement) {
            // 点击非表格，activeElement 在 .protyle-wysiwyg
            // 点击表格，activeElement 在 TABLE
            // 触屏点击，activeElement 在点击的元素
            editor = document.activeElement.closest('.protyle-wysiwyg');
        }
        // 焦点不在编辑器内就直接返回
        if (!editor) return;

        // 编辑器内有选中块时不必凸显聚焦块，清除属性后返回
        if (editor.querySelector('.protyle-wysiwyg--select')) {
            this.clearBlockFocusAttribute(editor);
            return;
        }

        // 获取焦点所在块
        let block: HTMLElement | null = null;
        if (event.target instanceof HTMLElement) {
            // 优先处理鼠标事件：获取点击的元素所在块（例如数据库元素对应的数据库块）
            const targetBlock = event.target.closest('[data-node-id]');
            if (targetBlock instanceof HTMLElement) {
                block = targetBlock;
            }
        }
        if (!block && event instanceof TouchEvent && event.changedTouches && event.changedTouches.length > 0) {
            // 处理触屏事件：获取触摸点所在块（AI 生成的，不知道实际上能否用上）
            const touch = event.changedTouches[0];
            const touchTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            if (touchTarget instanceof HTMLElement) {
                const touchBlock = touchTarget.closest('[data-node-id]');
                if (touchBlock instanceof HTMLElement) {
                    block = touchBlock;
                }
            }
        }
        if (!block) {
            // 处理键盘操作：获取光标所在块
            const selection = window.getSelection();
            if (!selection || !selection.anchorNode) return;

            const element = selection.anchorNode.parentElement;
            if (element instanceof HTMLElement) {
                block = element.closest('[data-node-id]');
            }
        }
        
        // 当前块已经设置属性时直接返回
        if (block?.hasAttribute('data-whisper-block-focus')) return;

        // 清除当前编辑器内非聚焦块上的属性
        this.clearBlockFocusAttribute(editor);
        
        // 光标在块内，并且这个块不在嵌入块内时，给这个块添加属性 data-whisper-block-focus
        if (block && !block.closest('.protyle-wysiwyg__embed')) {
            block.dataset.whisperBlockFocus = '';
        }
    };

    /**
     * 清除指定容器内或整个文档中的块焦点属性
     * @param container 指定的容器元素，不传则默认为整个界面
     */
    private clearBlockFocusAttribute(container: HTMLElement | Document = document): void {
        container.querySelectorAll('[data-whisper-block-focus]').forEach((element) => {
            if (element instanceof HTMLElement) {
                delete element.dataset.whisperBlockFocus;
            }
        });
    }
} 