(function() {
    console.log('Whisper: Welcome!');

    // 判断是否为手机
    let isMobile;
    (async () => {
        // TODO跟进 https://github.com/siyuan-note/siyuan/issues/13952 如果支持了切换界面，需要在切换界面之后重新执行被跳过的程序
        isMobile = !!document.getElementById("sidebar");
    })();

    // 关闭或卸载主题
    window.destroyTheme = () => {
        // 给光标所在块添加类名 block-focus
        document.querySelectorAll('.block-focus').forEach((element) => element.classList.remove('block-focus')); // 移除添加的类名
        document.removeEventListener('mouseup', focusBlock); // 卸载事件监听器
        document.removeEventListener('keyup', focusBlock);

        // 监听元素是否隐藏。通过监听来代替使用 :has 选择器，提高性能
        cssObserver?.disconnect();

        // 鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加特定属性
        document.removeEventListener('mouseover', debouncedCheckAndAddClassOnHover);

        console.log('Whisper: Goodbye!');
    }

    // 通用防抖函数，func 为执行的函数，delay 为延迟时间（单位：毫秒）
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

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
        if (isMobile) return;
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

    // // 获取编辑器内包含特定属性和值的上层元素
    // // 为了提高性能，属性值只能是 string 类型，if 条件优化掉了 `typeof value === "string" &&` 和 `.split(" ")`
    // const hasClosestByAttribute = (e, attr, value) => {
    //     while (e && !e.classList.contains("protyle-wysiwyg")) {
    //         if (e.getAttribute(attr)?.includes(value)) return e; // 找到匹配的元素，直接返回
    //         e = e.parentElement; // 继续向上查找
    //     }
    //     return false; // 未找到匹配的元素
    // };

    // 添加类名会和原生的 showTooltip() 逻辑冲突，性能不太好，所以改为使用 data-* 属性
    // // 把类名添加到 tooltip 元素的 classList 中
    // const addClass2Tooltip = (tooltipClass) => {
    //     // 类名不存在才添加类名
    //     // 感觉理论上会有 tooltip 显示又隐藏了才添加类名的情况，但实际没感觉出有问题。不过即使 tooltip 隐藏了也要添加类名，因为可以有 .tooltip--custom.fn__none 的样式
    //     if (!tooltipElement.classList.contains(tooltipClass)) {
    //         tooltipElement.classList.add(tooltipClass);
    //     }
    // };

    // 给 tooltip 元素添加 data-whisper-tooltip 属性值
    const setTooltipData = (data) => {
        if (tooltipElement.dataset?.whisperTooltip !== data) {
            tooltipElement.dataset.whisperTooltip = data;
        }
    };

    // 判断元素是否需要添加类名
    // ~这个函数不能弄防抖，因为原生的 showTooltip() 没有防抖，会覆盖掉类名~ 改成添加data-*属性就可以做防抖了，不会被原生的 showTooltip() 影响
    // 不在编辑器内的元素可以直接用 .closest 查
    const checkAndAddClassOnHover = (event) => {
        if (!event.target || event.target.nodeType === 9) return false;
        const e = event.target.nodeType === 3 ? event.target.parentElement : event.target;

        // 表情选择器上的表情、底部选项
        if (e.classList.contains("emojis__item") || e.classList.contains("emojis__type")) {
            setTooltipData("emoji");
            return;
        }
        // 数据库资源字段中的链接、属性面板数据库资源字段中的链接
        if (e.parentElement?.closest('[data-dtype="mAsset"]') || e.parentElement?.closest('[data-type="mAsset"]')) {
            setTooltipData("href_av");
            return;
        }
        // 页签
        if (e.parentElement?.closest('[data-type="tab-header"]')) {
            setTooltipData("tab_header");
            return;
        }
        // 如果正在显示的 tooltip 不属于特定元素，就将属性置空
        if (!tooltipElement.classList.contains("fn__none")) {
            tooltipElement.dataset.whisperTooltip = "";
        }
    };
    // 防抖：checkAndAddClassOnHover 几乎都在 1ms 内执行完成，所以设置 delay 为 1ms。这里的防抖大概能减少两个数量级的函数执行次数
    const debouncedCheckAndAddClassOnHover = debounce(checkAndAddClassOnHover, 1);

    // 功能：鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加特定属性
    // TODO 1 PR 合并后才能用这个功能 https://github.com/siyuan-note/siyuan/pull/13966
    let tooltipElement;
    (async () => {
        if (isMobile) return;
        tooltipElement = document.getElementById("tooltip");
        if (tooltipElement) {
            // 参考原生的 initBlockPopover 函数
            document.addEventListener('mouseover', debouncedCheckAndAddClassOnHover);
        } else {
            console.log("Whisper: tooltip element does not exist.");
        }
    })();
})();
