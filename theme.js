(function() {
    console.log('Whisper: Welcome!');

    // 关闭或卸载主题
    window.destroyTheme = () => {
        // 给光标所在块添加类名 block-focus
        document.querySelectorAll('.block-focus').forEach((element) => element.classList.remove('block-focus')); // 移除添加的类名
        document.removeEventListener('mouseup', focusBlock); // 卸载事件监听器
        document.removeEventListener('keyup', focusBlock);

        // 监听元素是否隐藏。通过监听来代替使用 :has 选择器，提高性能
        cssObserver?.disconnect();

        // 鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加类名
        document.removeEventListener('mouseover', checkAndAddClassOnHover);

        console.log('Whisper: Goodbye!');
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

    // 功能：给光标所在块添加类名 block-focus
    (async () => {
        document.addEventListener('mouseup', focusBlock);
        document.addEventListener('keyup', focusBlock);
    })();

    // 功能：监听元素是否隐藏。通过监听来代替使用 :has 选择器，提高性能
    let cssObserver;
    (async () => {
        // 选择需要观察的目标节点
        const targetNodeStatus = document.querySelector('#status');
        const targetNodeDockBottom = document.querySelector('#dockBottom');

        // 手动检查一次并设置初始状态
        document.body.dataset.whisperStatus = targetNodeStatus.classList.contains('fn__none') ? 'hide' : 'show';
        document.body.dataset.whisperDockBottom = targetNodeDockBottom.classList.contains('fn__none') ? 'hide' : 'show';

        // 创建一个回调函数，当观察到变动时执行
        const callback = function(mutationsList) {
            for(let mutation of mutationsList) {
                const targetNode = mutation.target;
                const data = targetNode.classList.contains('fn__none') ? 'hide' : 'show';
                if (targetNode === targetNodeStatus) {
                    document.body.dataset.whisperStatus = data;
                } else if (targetNode === targetNodeDockBottom) {
                    document.body.dataset.whisperDockBottom = data;
                }
            }
        };

        cssObserver = new MutationObserver(callback);

        // 传入目标节点和观察选项
        cssObserver.observe(targetNodeStatus, { attributeFilter: ['class'] });
        cssObserver.observe(targetNodeDockBottom, { attributeFilter: ['class'] });
    })();

    // 获取包含特定类名的上层元素
    // const hasClosestByClassName = (e, className, top = false) => {
    //     if (!e || e.nodeType === 9) return false;
    //     if (e.nodeType === 3) e = e.parentElement;
    //     if (top) {
    //         while (e?.tagName !== "BODY") {
    //             if (e.classList?.contains(className)) return e;
    //             e = e.parentElement;
    //         }
    //     } else {
    //         while (e && !e.classList.contains("protyle-wysiwyg")) {
    //             if (e.classList?.contains(className)) return e;
    //             e = e.parentElement;
    //         }
    //     }
    //     return false;
    // };

    // 获取包含特定属性和值的上层元素
    // 属性值只能是 string 类型，if 条件优化掉了 `typeof value === "string" &&`
    const hasClosestByAttribute = (e, attr, value) => {
        // 到达 <html> 元素时，e.parentElement 会返回 null，跳出循环
        while (e) {
            if (e.getAttribute(attr)?.includes(value)) return e; // 找到匹配的元素，直接返回；为了提高性能，优化掉了 .split(" ")
            e = e.parentElement; // 继续向上查找
        }
        return false; // 未找到匹配的元素
    };

    // 把类名添加到 tooltip 元素的 classList 中
    const addClass2Tooltip = (tooltipClass) => {
        // 类名不存在才添加类名
        // 感觉理论上会有 tooltip 显示又隐藏了才添加类名的情况，但实际没测出来。不过即使 tooltip 隐藏了也要添加类名，因为可以有 .tooltip--custom.fn__none 的样式
        if (!tooltipElement.classList.contains(tooltipClass)) {
            tooltipElement.classList.add(tooltipClass);
        }
    };

    // 判断元素是否需要添加类名
    const checkAndAddClassOnHover = (event) => {
        if (!event.target || event.target.nodeType === 9) return false;
        const element = event.target.nodeType === 3 ? event.target.parentElement : event.target;

        // 表情选择器上的表情、底部选项
        if (element.classList.contains("emojis__item") || element.classList.contains("emojis__type")) {
            addClass2Tooltip("tooltip--emoji");
            return;
        }
        // 数据库资源字段中的链接、属性面板数据库资源字段中的链接
        if (element.parentElement?.closest('[data-dtype="mAsset"]') || element.parentElement?.closest('[data-type="mAsset"]')) {
            addClass2Tooltip("tooltip--href_av");
            return;
        }
        // 页签
        const tabHeaderElement = hasClosestByAttribute(element, "data-type", "tab-header");
        if (tabHeaderElement) {
            if (tabHeaderElement.hasAttribute("aria-label")) {
                addClass2Tooltip("tooltip--tab_header");
            } else {
                // 如果页签没有 aria-label 属性，说明 tooltip 也还没有被添加
                // 要监听 tooltipElement 元素的类名变化，等 fn__none 类名被移除之后再调用 addClass2Tooltip() 和卸载监听
                // TODO 这个地方比较影响性能，需要思考更好的方法
                let tooltipObserver = new MutationObserver((mutationsList) => {
                    for (let mutation of mutationsList) {
                        if (!tooltipElement.classList.contains('fn__none')) {
                            addClass2Tooltip("tooltip--tab_header");
                            tooltipObserver.disconnect(); // 卸载监听
                        }
                    }
                });
                tooltipObserver.observe(tooltipElement, { attributeFilter: ['class'] });
            }
            // return;
        }
    };

    // 功能：鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加类名
    let tooltipElement;
    (async () => {
        tooltipElement = document.getElementById("tooltip");
        if (tooltipElement) {
            // 参考原生的 initBlockPopover 函数
            document.addEventListener('mouseover', checkAndAddClassOnHover);
        } else {
            console.log("Whisper: tooltip element does not exist.");
        }
    })();
})();
