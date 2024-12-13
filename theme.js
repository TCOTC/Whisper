// 使用立即执行函数表达式（IIFE）来管理变量作用域
(function() {
    // 使用 window 对象来存储全局状态
    window.isBulletMainExecuted = typeof window.isBulletMainExecuted !== 'undefined' ? window.isBulletMainExecuted : false;

    window.destroyTheme = () => {
        if (window.isBulletMainExecuted) {// 仅在 bulletMain 执行后才进行清理
            // 卸载“跟踪当前所在块”的事件监听器
            bulletCleanup();
        }
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

    const bulletMain = function() {
        window.isBulletMainExecuted = true; // 标记 bulletMain 已经执行
        // 跟踪当前所在块
        window.addEventListener('mouseup', focusHandler, true);
        window.addEventListener('keyup', focusHandler, true);
    };

    const bulletCleanup = function() {
        // 移除类名
        document.querySelectorAll('.block-focus').forEach((element) => element.classList.remove('block-focus'));
        // 卸载事件监听器
        window.removeEventListener('mouseup', focusHandler, true);
        window.removeEventListener('keyup', focusHandler, true);
        // 卸载完毕
        window.isBulletMainExecuted = false;
    };

    (async () => {
        bulletMain();
    })();
})();
