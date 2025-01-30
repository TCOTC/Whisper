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

    const isLocalPath = (link) => {
        if (!link) {
            return false;
        }

        link = link.trim();
        if (1 > link.length) {
            return false;
        }

        link = link.toLowerCase();
        if (link.startsWith("assets/") || link.startsWith("file://") || link.startsWith("\\\\") /* Windows 网络共享路径 */) {
            return true;
        }

        const colonIdx = link.indexOf(":");
        return 1 === colonIdx; // 冒号前面只有一个字符认为是 Windows 盘符而不是网络协议
    };

    // 给 tooltip 元素添加 data-whisper-tooltip 属性值
    const setTooltipData = (data) => {
        console.log("setTooltipData");
        if (clonedTooltip.dataset?.whisperTooltip !== data) {
            clonedTooltip.dataset.whisperTooltip = data;
        }
    };

    // 类型处理程序
    const typeHandler = (styleObject) => {
        if (!mouseoverEventTarget || mouseoverEventTarget.nodeType === 9) return false;
        // const e = mouseoverEventTarget.nodeType === 3 ? mouseoverEventTarget.parentElement : mouseoverEventTarget;
        const e = mouseoverEventTarget;

        console.log(styleObject);
        console.log(e);
        // 文本超链接
        if (e.getAttribute("data-href")) {
            // 资源文件链接
            if (isLocalPath(e.getAttribute("data-href"))) {
                setTooltipData("href_asset");
                return;
            }
            // 普通链接
            styleObject.top = "unset";
            styleObject.left = "0px";
            styleObject.bottom = "0px";
            setTooltipData("href");
            return;
        }
        // 页签
        if (e.parentElement?.closest('[data-type="tab-header"]') || e.closest('[data-type="tab-header"]')) {
            setTooltipData("tab_header");
            return;
        }
        // 数据库超链接
        if (e.classList.contains("av__celltext--url")) {
            setTooltipData("href_av");
            return;
        }
        // 表情选择器上的表情、底部选项
        if (e.classList.contains("emojis__item") || e.classList.contains("emojis__type")) {
            setTooltipData("emoji");
            return;
        }
        // TODO 1 鼠标移动到不符合条件的元素上，属性移除不及时。动画时间 500ms 后要移除属性，如果在此之前就移动到其他元素上了，就不在移除（因为已经移除了）
        // 如果正在显示的 tooltip 不属于特定元素，就将属性置空
        if (!clonedTooltip.classList.contains("fn__none")) {
            clonedTooltip.dataset.whisperTooltip = "";
        }
    };

    let mouseoverEventTarget;
    const updateMouseoverEventTarget = (event) => {
        console.log("updateMouseoverEventTarget");
        const target = event.target;
        if (mouseoverEventTarget !== target) {
            mouseoverEventTarget = target;
            console.log(target);
        }
    };
    // TODO 之后看看需不需要这里的防抖，看看是不是防抖导致的元素闪现
    // const debouncedUpdateMouseoverEventTarget = debounce(updateMouseoverEventTarget, 1);

    // TODO 1 隐藏 tooltip 元素，创建一个 clone 元素显示（监听 tooltip 元素的变化），控制 clone 元素的 style 属性和显示逻辑以避免 tooltip 元素的闪烁
    // 功能：鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加特定属性
    let tooltipElement, clonedTooltip, tooltipObserver;
    (async () => {
        console.log("执行了");
        if (isMobile) return;
        tooltipElement = document.getElementById("tooltip");
        if (tooltipElement) {
            // 获取鼠标当前悬停的元素
            document.addEventListener('mouseover', updateMouseoverEventTarget);

            clonedTooltip = tooltipElement.cloneNode(true);
            clonedTooltip.id  = "whisperTooltip";
            document.body.append(clonedTooltip);

            // 当 tooltip 元素的 style 属性发生变化时，特殊处理 class style interHTML 的变化之后转移到 cloneTooltip 元素上
            const tooltip2clonedTooltip = function(mutationsList) {
                for(let mutation of mutationsList) {
                    if (mutation.attributeName !== 'style' && mutation.attributeName === 'class') {
                        clonedTooltip.className = tooltipElement.className;
                        return;
                    }
                    // 获取元素的 style 属性
                    let tooltipStyle = tooltipElement.getAttribute("style");
                    // 将 style 字符串解析成对象
                    const styleObject = {};
                    tooltipStyle.split(';').forEach((stylePair) => {
                        if (stylePair.trim()) {
                            const [key, value] = stylePair.split(':').map(part => part.trim());
                            styleObject[key] = value;
                        }
                    });

                    // TODO 处理 style，链接： top = "unset" left = "0px" bottom = "0px";
                    typeHandler(styleObject);

                    // 将对象重新转换回字符串
                    tooltipStyle = Object.entries(styleObject).map(([key, value]) => `${key}: ${value}`).join('; ');
                    if (clonedTooltip.getAttribute("style") !== tooltipStyle) {
                        clonedTooltip.setAttribute("style", tooltipStyle);
                    }
                    if (clonedTooltip.className !== tooltipElement.className) {
                        clonedTooltip.className = tooltipElement.className;
                    }
                    if (clonedTooltip.innerHTML !== tooltipElement.innerHTML) {
                        // 这个 if 条件应该可以去掉，多数情况下新的 tooltip 元素的 innerHTML 和上一个 tooltip 元素的 innerHTML 不同
                        clonedTooltip.innerHTML = tooltipElement.innerHTML;
                    }
                }
            };

            // 监听 tooltip 元素的 style 属性变化，变化了就说明是跟上一个不同的 tooltip
            // TODO 监听类名变化：fn__none
            tooltipObserver = new MutationObserver(tooltip2clonedTooltip);
            tooltipObserver.observe(tooltipElement, { attributeFilter: ['style', 'class'] });
        } else {
            // TODO跟进 PR 合并后才能用这个功能，不过没合并之前也不会有问题，会执行 else 分支 https://github.com/siyuan-note/siyuan/pull/13966
            console.log("Whisper: tooltip element does not exist.");
        }
    })();
})();
