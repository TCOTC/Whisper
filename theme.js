(function() {
    (async () => {
        console.log('Welcome to the Whisper theme!');
    })();

    // 关闭或卸载主题
    window.destroyTheme = () => {
        console.log('Whisper theme goodbye!');

        // 跟踪当前所在块
        document.querySelectorAll('.block-focus').forEach((element) => element.classList.remove('block-focus')); // 移除添加的类名
        document.removeEventListener('mouseup', focusBlock); // 卸载事件监听器
        document.removeEventListener('keyup', focusBlock);

        // 监听元素变化
        observer?.disconnect();

        document.removeEventListener('mouseover', checkAndAddClassOnHover);
    }

    const focusBlock = function() {
        const editor = document.activeElement.classList.contains('protyle-wysiwyg') ? document.activeElement : null;
        if (!editor) return; // 焦点不在编辑器内就直接返回

        // 获取光标所在块
        let block = window.getSelection()?.anchorNode?.parentElement?.closest('[data-node-id]'); // 光标在选区前面，所以用 anchorNode

        // 编辑器内有选中块时不必凸显聚焦块，清除类名后返回
        if (editor?.querySelector(`.protyle-wysiwyg--select`)) {
            // 清除当前编辑器内所有块上的类名
            editor.querySelectorAll(`.block-focus`).forEach((element) => element.classList.remove(`block-focus`));
            return;
        }

        // 光标不在块内 或者 当前块已经设置类名 时直接返回
        if (block?.classList.contains(`block-focus`)) return;

        // 清除当前编辑器内非聚焦块上的类名
        editor.querySelectorAll(`.block-focus`).forEach((element) => element.classList.remove(`block-focus`));

        block.classList.add(`block-focus`);
    };

    // 跟踪当前所在块
    (async () => {
        document.addEventListener('mouseup', focusBlock);
        document.addEventListener('keyup', focusBlock);
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

    const hasClosestByClassName = (e, className, top = false) => {
        if (!e || e.nodeType === 9) return false;
        if (e.nodeType === 3) e = e.parentElement;
        if (top) {
            while (e?.tagName !== "BODY") {
                if (e.classList?.contains(className)) return e;
                e = e.parentElement;
            }
        } else {
            while (e && !e.classList.contains("protyle-wysiwyg")) {
                if (e.classList?.contains(className)) return e;
                e = e.parentElement;
            }
        }
        return false;
    };

    // 拼接类名并添加到 tooltipElement 的 classList 中
    const addClasses2Tooltip = (tooltipClasses) => {
        tooltipClasses.forEach(cls => {
            const fullClassName = `tooltip--${cls}`;
            // 如果类名不存在且 tooltip 元素没有隐藏，才添加类名
            if (!tooltipElement.classList.contains(fullClassName) && !tooltipElement.classList.contains("fn__none")) {
                tooltipElement.classList.add(fullClassName);
            }
        });
    };

    // 判断元素是否需要添加类名
    const checkAndAddClassOnHover = (event) => {

        // TODO 两种情况：1.tooltip显示了又隐藏了就不再继续执行 2.tooltip还没开始显示的话要等到显示了再继续执行。如果判断不了的话就先不管了，反正是小概率事件
        // // 没显示 tooltip 时，需要等到 tooltip 显示之后再判断和添加类名，否则原生 showTooltip 时会覆盖掉这里添加的类名
        // if (tooltipElement.classList.contains("fn__none")) {
        //     // TODO 1 监听 tooltip 元素移除 fn__none 类名，然后卸载监听器继续执行后面的代码
        // }
        // emoji 元素
        const emojiElement = hasClosestByClassName(event.target, "emojis__item", true) ||
            hasClosestByClassName(event.target, "emojis__type", true);
        if (emojiElement) {
            const tooltipClasses = [];
            tooltipClasses.push("emoji");
            addClasses2Tooltip(tooltipClasses);
            return;
        }
        // 数据库资源字段中的链接
        const avHrefElement = hasClosestByClassName(event.target, "av__celltext--url");
        if (avHrefElement?.parentElement?.closest('[data-dtype="mAsset"]')) {
            const tooltipClasses = [];
            tooltipClasses.push("av-href");
            addClasses2Tooltip(tooltipClasses);
            // return;
        }
    };

    // 鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加类名
    let tooltipElement;
    (async () => {
        tooltipElement = document.getElementById("tooltip");
        if (tooltipElement) {
            // initBlockPopover
            document.addEventListener('mouseover', checkAndAddClassOnHover);
        } else {
            console.log("Whisper: tooltip element does not exist.");
        }
    })();
})();
