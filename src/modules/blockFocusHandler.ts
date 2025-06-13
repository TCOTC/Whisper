import { ThemeModule } from '../types';

export class BlockFocusHandler implements ThemeModule {
    /**
     * 初始化块焦点处理器
     */
    public init(): void {
        // 给光标所在块添加属性 data-whisper-block-focus
        document.addEventListener('mouseup', this.focusBlock, true);     // 鼠标点击之后
        document.addEventListener('keyup', this.focusBlock, true);       // 按下按键之后
        document.addEventListener('dragend', this.focusBlock, true);     // 拖拽块之后
        // 触屏
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
        // 触屏
        document.removeEventListener('touchend', this.focusBlock, true);
        document.removeEventListener('touchcancel', this.focusBlock, true);

        // 移除添加的属性
        this.clearBlockFocusAttribute();
    }

    /**
     * 处理块焦点
     */
    private focusBlock = (event: MouseEvent | KeyboardEvent | DragEvent | TouchEvent): void => {
        // 获取活动编辑器
        let editor: HTMLElement | null = null;
        if (document.activeElement instanceof HTMLElement) {
            editor = document.activeElement.closest('.protyle-wysiwyg');
        }
        
        if (!editor) return; // 焦点不在编辑器内就直接返回

        // 编辑器内有选中块时不必凸显聚焦块，清除属性后返回
        if (editor.querySelector('.protyle-wysiwyg--select')) {
            // 清除当前编辑器内所有块上的属性
            this.clearBlockFocusAttribute(editor);
            return;
        }

        let block: HTMLElement | null = null;
        // 优先获取点击的元素所在块（例如数据库元素对应的数据库块）
        // 鼠标事件处理：从点击的元素获取块
        if (event.target instanceof HTMLElement) {
            const targetBlock = event.target.closest('[data-node-id]');
            if (targetBlock instanceof HTMLElement) {
                block = targetBlock;
            }
        }
        
        // 触屏事件处理：从触摸点获取块（AI 生成的，不知道实际上能否用上）
        if (!block && event instanceof TouchEvent && event.changedTouches && event.changedTouches.length > 0) {
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
            // 键盘操作的情况下获取光标所在块
            const selection = window.getSelection();
            if (!selection || !selection.anchorNode) return;

            const parentElement = selection.anchorNode.parentElement;
            if (parentElement) {
                const closestBlock = parentElement.closest('[data-node-id]');
                if (closestBlock instanceof HTMLElement) {
                    block = closestBlock;
                }
            }
        }
        
        // 当前块已经设置属性时直接返回
        if (block?.hasAttribute('data-whisper-block-focus')) return;

        // 清除当前编辑器内非聚焦块上的属性
        this.clearBlockFocusAttribute(editor);
        
        // 光标不在块内或点击的元素在嵌入块内时，清除当前编辑器内非聚焦块上的属性后返回
        if (!block || block.closest('.protyle-wysiwyg__embed')) return;

        block.dataset.whisperBlockFocus = "";
    };

    /**
     * 清除指定容器内或整个文档中的块焦点属性
     * @param container 指定的容器元素，不传则默认为整个文档
     */
    private clearBlockFocusAttribute(container: HTMLElement | Document = document): void {
        container.querySelectorAll('[data-whisper-block-focus]').forEach((element) => {
            if (element instanceof HTMLElement) {
                delete element.dataset.whisperBlockFocus;
            }
        });
    }
} 