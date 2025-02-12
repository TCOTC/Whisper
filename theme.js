(function() {
    console.log('Whisper: loaded');

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
        document.removeEventListener('mouseup', focusBlock, true); // 卸载事件监听器
        document.removeEventListener('keyup', focusBlock, true);

        // 监听元素状态。通过给 body 添加属性来代替使用 :has 选择器，提高性能
        cssObserver?.disconnect();
        document.body.removeAttribute("data-whisper-status");
        document.body.removeAttribute("data-whisper-dock-bottom");
        document.body.removeAttribute("data-whisper-layout-dockr");

        // 鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加特定属性
        document.removeEventListener('mouseover', updateTooltipData);
        tooltipElement?.removeAttribute("data-whisper-tooltip");

        console.log('Whisper: unloaded');
    }

    // // 通用防抖函数，func 为执行的函数，delay 为延迟时间（单位：毫秒）
    // const debounce = (func, delay) => {
    //     let timeoutId;
    //     return (...args) => {
    //         clearTimeout(timeoutId);
    //         timeoutId = setTimeout(() => {
    //             func.apply(this, args);
    //         }, delay);
    //     };
    // };

    const focusBlock = (event) => {
        let editor = document.activeElement.classList.contains('protyle-wysiwyg') ? document.activeElement : null;
        if (!editor) {
            // TODO测试 看看每种类型的块都行不行
            // 光标在表格块内
            editor = document.activeElement.tagName === 'TABLE' ? document.activeElement.closest('.protyle-wysiwyg') : null;
        }
        if (!editor) return; // 焦点不在编辑器内就直接返回

        // 编辑器内有选中块时不必凸显聚焦块，清除类名后返回
        if (editor?.querySelector(`.protyle-wysiwyg--select`)) {
            // 清除当前编辑器内所有块上的类名
            editor.querySelectorAll(`.block-focus`).forEach((element) => element.classList.remove(`block-focus`));
            return;
        }

        // 优先获取光标所在块，其次获取点击的元素所在块（例如数据库元素对应的数据库块）
        const block = window.getSelection()?.anchorNode?.parentElement?.closest('[data-node-id]') || event.target.closest('[data-node-id]'); // 光标在选区前面，所以用 anchorNode
        // 当前块已经设置类名 时直接返回
        if (block?.classList.contains(`block-focus`)) return;

        // 清除当前编辑器内非聚焦块上的类名
        editor.querySelectorAll(`.block-focus`).forEach((element) => element.classList.remove(`block-focus`));
        // 光标不在块内 / 点击的元素在嵌入块内 时，清除当前编辑器内非聚焦块上的类名后返回
        if (!block || block?.closest('.protyle-wysiwyg__embed')) return;

        block.classList.add(`block-focus`);
    };

    // 功能：给光标所在块添加类名 block-focus
    (async () => {
        document.addEventListener('mouseup', focusBlock, true);
        document.addEventListener('keyup', focusBlock, true);
    })();

    // 功能：监听元素状态。通过给 body 添加属性来代替使用 :has 选择器，提高性能
    let cssObserver;
    (async () => {
        if (isMobile) return;

        // 定义需要查找的目标节点
        const targetSelectors = {
            status: '#status',
            dockBottom: '#dockBottom',
            layoutDockr: '.layout__dockr'
        };

        // 重试机制
        const retryInterval = 100; // 重试间隔时间，单位：毫秒
        const maxRetries = 50; // 最大重试次数
        let retryCount = 0;

        const findTargetNodes = () => {
            const targetNodeStatus = document.querySelector(targetSelectors.status);
            const targetNodeDockBottom = document.querySelector(targetSelectors.dockBottom);
            const targetNodeLayoutDockr = document.querySelector(targetSelectors.layoutDockr);

            if (targetNodeStatus && targetNodeDockBottom && targetNodeLayoutDockr) {
                // 找到所有目标节点，清除定时器并继续执行
                clearInterval(retryIntervalId);
                setupObserver(targetNodeStatus, targetNodeDockBottom, targetNodeLayoutDockr);
            } else if (retryCount >= maxRetries) {
                // 达到最大重试次数仍未找到，清除定时器并退出
                clearInterval(retryIntervalId);
                // 输出无法找到的节点
                if (!targetNodeStatus) console.error('Whisper: failed to find target node:', targetSelectors.status);
                if (!targetNodeDockBottom) console.error('Whisper: failed to find target node:', targetSelectors.dockBottom);
                if (!targetNodeLayoutDockr) console.error('Whisper: failed to find target node:', targetSelectors.layoutDockr);
            } else {
                retryCount++;
            }
        };

        const setupObserver = (targetNodeStatus, targetNodeDockBottom, targetNodeLayoutDockr) => {
            // 手动检查一次并设置初始状态
            document.body.dataset.whisperStatus = targetNodeStatus.classList.contains('fn__none') ? 'hide' : 'show';
            document.body.dataset.whisperDockBottom = targetNodeDockBottom.classList.contains('fn__none') ? 'hide' : 'show';
            document.body.dataset.whisperLayoutDockr = targetNodeLayoutDockr.classList.contains('layout--float') ? 'float' : 'pin';

            // 创建一个回调函数，当观察到变动时执行
            const callback = function(mutationsList) {
                for(let mutation of mutationsList) {
                    const targetNode = mutation.target;
                    if (targetNode === targetNodeStatus) {
                        document.body.dataset.whisperStatus = targetNode.classList.contains('fn__none') ? 'hide' : 'show';
                    } else if (targetNode === targetNodeDockBottom) {
                        document.body.dataset.whisperDockBottom = targetNode.classList.contains('fn__none') ? 'hide' : 'show';
                    } else if (targetNode === targetNodeLayoutDockr) {
                        document.body.dataset.whisperLayoutDockr = targetNode.classList.contains('layout--float') ? 'float' : 'pin';
                    }
                }
            };

            cssObserver = new MutationObserver(callback);

            // 传入目标节点和观察选项
            cssObserver.observe(targetNodeStatus, { attributeFilter: ['class'] });
            cssObserver.observe(targetNodeDockBottom, { attributeFilter: ['class'] });
            cssObserver.observe(targetNodeLayoutDockr, { attributeFilter: ['class'] });
        };

        // 启动重试机制
        const retryIntervalId = setInterval(findTargetNodes, retryInterval);
    })();

    const isLocalPath = (link) => {
        // 参考原生 isLocalPath 函数
        link = link?.trim();
        if (!link || link.length === 0) return false;
        return /^assets\/|file:\/\/|\\\\|[A-Z]:$/i.test(link);
    };

    // 给 tooltip 元素添加 data-whisper-tooltip 属性值
    const setTooltipData = (data) => {
        if (tooltipElement.dataset?.whisperTooltip !== data) {
            tooltipElement.dataset.whisperTooltip = data;
        }
    };

    // 判断元素是否需要添加特定属性。原生的 showTooltip() 会覆盖掉类名，改成添加 data-* 属性就不会冲突了
    const updateTooltipData = (event) => {
        if (!event.target || event.target.nodeType === 9) return;
        const e = event.target.nodeType === 3 ? event.target.parentElement : event.target;

        // 按照触发频率排序

        // 文本超链接
        const href = e.getAttribute("data-href")
        if (href) {
            // 资源文件链接
            if (isLocalPath(href)) {
                setTooltipData("href_asset");
                return;
            }
            // 普通链接
            setTooltipData("href");
            return;
        }

        // 页签
        if (e.closest('[data-type="tab-header"]')) {
            setTooltipData("tab_header");
            return;
        }

        // 数据库单元格、“添加”按钮、视图
        if (e.closest(".av__cell") ||
            e.closest('[data-type="av-add"]') || e.closest('[data-type="av-add-more"]') || e.closest('[data-type="av-header-add"]') ||
            e.closest('[data-page]')) {
            setTooltipData("av");
            return;
        }

        // 表情选择器上的表情、底部选项
        if (e.classList.contains("emojis__item") || e.classList.contains("emojis__type")) {
            setTooltipData("emoji");
            return;
        }

        // 如果正在显示的 tooltip 不属于特定元素，就将属性置空
        if (!tooltipElement.classList.contains("fn__none")) {
            tooltipElement.dataset.whisperTooltip = "";
        }
    };
    // 不能用防抖，属性添加不及时会导致元素闪现
    // const debouncedUpdateTooltipData = debounce(updateTooltipData, 1);

    // 功能：鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加特定属性
    // TODO跟进 https://github.com/siyuan-note/siyuan/pull/13966 PR 合并后才能用这个功能，不过没合并之前也几乎不会有问题，会执行 else 分支
    let tooltipElement;
    (async () => {
        if (isMobile) return;
        tooltipElement = document.getElementById("tooltip");
        if (tooltipElement) {
            // 参考原生的 initBlockPopover 函数
            document.addEventListener('mouseover', updateTooltipData);
        } else {
            console.error("Whisper: tooltip element does not exist.");
        }
    })();

    // 功能：切换外观模式时背景色过渡
    (async () => {
        const root = document.documentElement; // 获取 :root 元素

        const initRootObserver = () => {
            let switchTimer, lastThemeMode;
            const rootObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme-mode') {
                        // 读取 data-theme-mode 属性的值
                        const currentThemeMode = root.dataset.themeMode;

                        // 将上一次的值写入 data-whisper-last-theme-mode 属性
                        if (lastThemeMode) {
                            root.dataset.whisperLastThemeMode = lastThemeMode;
                        }

                        // 快速切换主题时取消前一次计时器
                        if (switchTimer) {
                            clearTimeout(switchTimer);
                        }

                        root.dataset.whisperSwitching = "true";
                        switchTimer = setTimeout(() => {
                            root.dataset.whisperSwitching = "false";
                        }, 300); // transition 耗时

                        // 更新 lastThemeMode 为当前值
                        lastThemeMode = currentThemeMode;
                    }
                });
            });

            // 监听属性变化
            rootObserver.observe(root, {  attributes: true });
        }

        // 如果 :root 元素不存在 data-whisper-last-switching 属性，则开始监听属性变化(只添加一次监听，并且不停止)
        if (!root.dataset.whisperSwitching) {
            // 初始化属性
            root.dataset.whisperLastThemeMode = root.dataset.themeMode;
            root.dataset.whisperSwitching = "false";
            initRootObserver();
        }

        // 切换到明亮模式的 Whisper 主题；切换到暗黑模式的 Whisper 主题
        const innerHTML = `:root:is([data-whisper-last-theme-mode="dark"][data-light-theme="Whisper"], [data-whisper-last-theme-mode="light"][data-dark-theme="Whisper"]):not([data-whisper-switching="false"]) {
            *, *::before, *::after {
                transition: background-color .3s ease-in-out 0ms !important;
            }
        }`;

        // 查找 head 中是否已存在样式
        if (!document.getElementById('whisperThemeSwitchStyle')) {
            // 如果不存在，则创建并添加样式(只添加一次，并且不移除)
            const style = document.createElement("style");
            style.id = "whisperThemeSwitchStyle";
            style.innerHTML = innerHTML;
            document.head.appendChild(style);
        } else {
            // 如果存在，则更新样式（更新主题可以更新样式）
            document.getElementById('whisperThemeSwitchStyle').innerHTML = innerHTML;
        }
    })();
})();
