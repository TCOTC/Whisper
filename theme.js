(function() {
    (async () => {
        console.log('Whisper: Welcome to the Whisper theme!');
    })();

    // 关闭或卸载主题
    window.destroyTheme = () => {
        console.log('Whisper: Goodbye Whisper theme!');

        // 给光标所在块添加类名 block-focus
        document.querySelectorAll('.block-focus').forEach((element) => element.classList.remove('block-focus')); // 移除添加的类名
        document.removeEventListener('mouseup', focusBlock); // 卸载事件监听器
        document.removeEventListener('keyup', focusBlock);

        // 监听元素是否隐藏。通过监听来代替使用 :has 选择器，提高性能
        observer?.disconnect();

        // 鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加类名
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

    // 功能：给光标所在块添加类名 block-focus
    (async () => {
        document.addEventListener('mouseup', focusBlock);
        document.addEventListener('keyup', focusBlock);
    })();

    // 功能：监听元素是否隐藏。通过监听来代替使用 :has 选择器，提高性能
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

    // 把类名添加到 tooltip 元素的 classList 中
    const addClasses2Tooltip = (tooltipClasses) => {
        tooltipClasses.forEach(cls => {
            // 类名不存在才添加类名
            // 感觉理论上会有 tooltip 显示又隐藏了才添加类名的情况，但实际没测出来。不过即使 tooltip 隐藏了也要添加类名，因为可以有 .tooltip--custom.fn__none 的样式
            if (!tooltipElement.classList.contains(cls)) {
                tooltipElement.classList.add(cls);
            }
        });
    };

    // 判断元素是否需要添加类名
    const checkAndAddClassOnHover = (event) => {
        if (!event.target || event.target.nodeType === 9) return false;
        const element = event.target.nodeType === 3 ? event.target.parentElement : event.target;

        // emoji 元素、emoji 选项
        if (element.classList.contains("emojis__item") || element.classList.contains("emojis__type")) {
            addClasses2Tooltip(["tooltip--emoji"]);
            return;
        }
        // 数据库资源字段中的链接、属性面板数据库资源字段中的链接
        if (element.parentElement?.closest('[data-dtype="mAsset"]') || element.parentElement?.closest('[data-type="mAsset"]')) {
            addClasses2Tooltip(["tooltip--av-href"]);
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
