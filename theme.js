(function() {
    (async () => {
        console.log('Welcome to the Whisper theme!');
    })();

    // 关闭或卸载主题
    window.destroyTheme = () => {
        console.log('Whisper theme goodbye!');

        // 跟踪当前所在块
        document.querySelectorAll('.block-focus').forEach((element) => element.classList.remove('block-focus')); // 移除添加的类名
        window.removeEventListener('mouseup', focusBlock, true); // 卸载事件监听器
        window.removeEventListener('keyup', focusBlock, true);

        // 监听元素变化
        observer?.disconnect();
    }

    const focusBlock = function() {
        const editor = document.activeElement.classList.contains('protyle-wysiwyg') ? document.activeElement : null;
        if (!editor) return; // 焦点不在编辑器内就直接返回

        // 获取光标所在块
        let block = window.getSelection()?.anchorNode?.parentElement; // 光标所在元素的父元素
        while (block && !(block instanceof HTMLElement && block.dataset.nodeId)) block = block.parentElement; // 光标所在块
        // 光标不在块内时直接返回；当前块已经设置类名时直接返回
        if (!block || block?.classList.contains(`block-focus`)) return;

        // 清除当前编辑器内非聚焦块上的类名
        editor.querySelectorAll(`.block-focus`).forEach((element) => element.classList.remove(`block-focus`));

        // 编辑器内有选中块时不必凸显聚焦块，直接返回
        if (editor?.querySelectorAll(`.protyle-wysiwyg--select`).length > 0) return;

        block.classList.add(`block-focus`);
    };

    // 跟踪当前所在块
    (async () => {
        window.addEventListener('mouseup', focusBlock, true);
        window.addEventListener('keyup', focusBlock, true);
    })();

    // 监听元素是否隐藏。通过监听来代替使用 :has 选择器，提高性能
    let observer;
    (async () => {
        // 选择需要观察的目标节点
        const targetNodeStatus = document.querySelector('#status');
        const targetNodeDockBottom = document.querySelector('#dockBottom');

        // 手动检查一次并设置初始状态
        document.body.dataset.whisperStatus = targetNodeStatus.classList.contains('fn__none') ? 'hide' : 'show';
        document.body.dataset.whisperDockBottom = targetNodeDockBottom.classList.contains('fn__none') ? 'hide' : 'show';

        const config = { attributes: true, attributeFilter: ['class'] };

        // 创建一个回调函数，当观察到变动时执行
        const callback = function(mutationsList) {
            for(let mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const targetNode = mutation.target;
                    const data = targetNode.classList.contains('fn__none') ? 'hide' : 'show';
                    if (targetNode === targetNodeStatus) {
                        document.body.dataset.whisperStatus = data;
                    } else if (targetNode === targetNodeDockBottom) {
                        document.body.dataset.whisperDockBottom = data;
                    }
                }
            }
        };

        observer = new MutationObserver(callback);

        // 传入目标节点和观察选项
        observer.observe(targetNodeStatus, config);
        observer.observe(targetNodeDockBottom, config);
    })();
})();
