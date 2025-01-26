(function() {
    (async () => {
        console.log('————————执行一次主题JS————————');
    })();

    // 定义全局变量
    let observer;

    window.destroyTheme = () => {
        console.log('————————移除一次主题————————');
        // 卸载“跟踪当前所在块”的事件监听器
        blockTrackCleanup();

        // 卸载 MutationObserver 监听器
        if (observer) {
            observer.disconnect();
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
        // TODO 1 需要排除上层块包含 .protyle-wysiwyg--select 的情况，这种情况下样式会造成干扰。hasClosestByClassName？
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

    // 通过监听来代替使用 :has 选择器，提高性能
    (async () => {
        // 选择需要观察的目标节点
        const targetNodeStatus = document.querySelector('#status');
        const targetNodeDockBottom = document.querySelector('#dockBottom');

        // 配置观察选项
        const config = { attributes: true, attributeFilter: ['class'] };

        // 创建一个回调函数，当观察到变动时执行
        const callback = function(mutationsList, observer) {
            for(let mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const targetNode = mutation.target;
                    const hasFnNone = targetNode.classList.contains('fn__none');
                    if (targetNode === targetNodeStatus) {
                        document.body.setAttribute('whisper-status', hasFnNone ? 'hide' : 'show');
                    } else if (targetNode === targetNodeDockBottom) {
                        document.body.setAttribute('whisper-dock-bottom', hasFnNone ? 'hide' : 'show');
                    }
                }
            }
        };

        // 手动检查一次并设置初始状态
        const hasFnNoneStatusInitial = targetNodeStatus.classList.contains('fn__none');
        document.body.setAttribute('whisper-status', hasFnNoneStatusInitial ? 'hide' : 'show');

        const hasFnNoneDockBottomInitial = targetNodeDockBottom.classList.contains('fn__none');
        document.body.setAttribute('whisper-dock-bottom', hasFnNoneDockBottomInitial ? 'hide' : 'show');

        // 创建一个观察器实例并传入回调函数
        observer = new MutationObserver(callback);

        // 传入目标节点和观察选项
        observer.observe(targetNodeStatus, config);
        observer.observe(targetNodeDockBottom, config);
    })();
})();
