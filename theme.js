// TODO 监听浮窗添加，然后展开聚焦的块（直接移除元素上的 [fold="1"] 属性即可，好像没有副作用）

(function() {
    // TODO 主题改完确定没问题之后就去除所有 log 输出
    (async () => {
        console.log('————————执行一次主题JS————————');
    })();

    window.destroyTheme = () => {
        console.log('————————移除一次主题————————');
        // 卸载“跟踪当前所在块”的事件监听器
        blockTrackCleanup();
    }

    /**
     * 获得指定块位于的编辑区
     * @param {HTMLElement} block
     * @return {HTMLElement} 光标所在块位于的编辑区
     * @return {null} 光标不在块内
     */
    const getTargetEditor = function(block) {
        while (block != null && !block.classList.contains('protyle-wysiwyg')) block = block.parentElement;
        return block;
    };

    /**
     * 获得焦点所在的块
     * @return {HTMLElement} 光标所在块
     * @return {null} 光标不在块内
     */
    const getFocusedBlock = function() {
        if (document.activeElement.classList.contains('protyle-wysiwyg')) {
            let block = window.getSelection()?.focusNode?.parentElement; // 当前光标
            while (block != null && block.dataset.nodeId == null) block = block.parentElement;
            return block;
        }
    };

    const focusHandler = function() {
        // TODO 需要排除上层块包含 .protyle-wysiwyg--select 的情况，这种情况下样式会造成干扰。hasClosestByClassName？
        // 获取当前编辑区
        let block = getFocusedBlock(); // 当前光标所在块
        // 当前块已经设置焦点
        if (block?.classList.contains(`block-focus`)) return;

        // 当前块未设置焦点
        const editor = getTargetEditor(block); // 当前光标所在块位于的编辑区
        if (editor) {
            editor.querySelectorAll(`.block-focus`).forEach((element) => element.classList.remove(`block-focus`));
            block.classList.add(`block-focus`);
            // setSelector(block);
        }
    };

    const blockTrackMain = function() {
        // 跟踪当前所在块
        window.addEventListener('mouseup', focusHandler, true);
        window.addEventListener('keyup', focusHandler, true);
    };

    const blockTrackCleanup = function() {
        // 移除类名
        document.querySelectorAll('.block-focus').forEach((element) => element.classList.remove('block-focus'));
        // 卸载事件监听器
        window.removeEventListener('mouseup', focusHandler, true);
        window.removeEventListener('keyup', focusHandler, true);
    };

    (async () => {
        blockTrackMain();
    })();
})();
