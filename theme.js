(function() {
    (async () => {
        console.log('————————执行一次主题JS————————');
    })();

    let tooltipObserver;

    window.destroyTheme = () => {
        console.log('————————移除一次主题————————');
        // 卸载“跟踪当前所在块”的事件监听器
        blockTrackCleanup();
        // 停止监听 body 子元素
        if (bodyObserver) {
            bodyObserver.disconnect();
        }
        // 停止监听 .tooltip--href 的更新
        if (tooltipObserver) {
            tooltipObserver.disconnect();
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

    // 存储每个节点的定时器 ID
    const nodeTimeoutMap = new Map();

    // 监听 body 的直接子元素 #tooltip 的添加
    const bodyObserver = new MutationObserver((mutationsList) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.id === 'tooltip') {
                        console.log('#tooltip 添加到 DOM');
                        // 停止监听 body 的变化
                        bodyObserver.disconnect();

                        initTooltipObserver(); // 监听 #tooltip 元素的更新

                        if (node.classList.contains('tooltip--href') || node.classList.contains('tooltip--tab_header')) {
                            // 执行初始的添加类名逻辑
                            addClassWithDelay(node);
                        }
                    }
                });
            }
        }
    });

    const config = { childList: true, subtree: false };

    function initTooltipObserver() {
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
        // 启动新的 MutationObserver 监听 #tooltip 元素的更新
        tooltipObserver = new MutationObserver(debounce((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {

                    const newClasses = node.className;

                    console.log(`类名从 "${currentClasses}" 更改为 "${newClasses}"`);
                    if (node.classList.contains('tooltip--href')) {
                        if (node.classList.contains('fn__none') && node.classList.contains('tooltip__wider')) {
                            // 元素包含 .fn__none 类名时移除 .tooltip--href 和 .tooltip__wider 类名
                            console.log('#tooltip 包含 .fn__none，删除 tooltip__wider');
                            // 清除之前的定时器
                            if (nodeTimeoutMap.has(node)) {
                                clearTimeout(nodeTimeoutMap.get(node));
                            }
                            // node.classList.remove('tooltip--href');
                            node.classList.remove('tooltip__wider');
                        } else if (!node.classList.contains('fn__none') && !node.classList.contains('tooltip__wider')) {
                            console.log('#tooltip 不包含 .fn__none，添加 tooltip__wider with delay');
                            addClassWithDelay(node);
                        }
                    }

                    // 记录当前的类名
                    currentClasses = node.className; // TODO 主题改完确定没问题之后就去除所有 log 输出
                }
            }
        }, 500)); // 500 毫秒的延迟

        const node = document.body.querySelector('#tooltip');
        console.log('获取 #tooltip 元素：', node); // 输出获取到的元素
        let currentClasses = node.className;

        // 配置监听属性变化
        const tooltipConfig = { attributes: true, attributeFilter: ['class'] };
        tooltipObserver.observe(node, tooltipConfig);
    }

    (async () => {
        // 切换主题时 #tooltip 有可能已经存在
        const tooltipElement = document.body.querySelector('#tooltip');

        if (tooltipElement) {
            console.log('#tooltip 已经存在，直接启动监听');
            initTooltipObserver();
        } else {
            console.log(bodyObserver);
            console.log(document.body);
            console.log(config);
            console.log('Observing document.body');
            // bodyObserver.observe(document.body, config);
        }
    })();

    // 辅助函数：延迟添加类名
    function addClassWithDelay(node) {
        // 清除之前的定时器
        if (nodeTimeoutMap.has(node)) {
            clearTimeout(nodeTimeoutMap.get(node));
        }

        // 设置新的定时器
        const timeoutId = setTimeout(() => {
            // 再次检查元素是否存在
            if (document.body.contains(node)) {
                console.log('向 #tooltip 添加 tooltip__wider');
                node.classList.add('tooltip__wider');
            }
            // 删除定时器 ID
            nodeTimeoutMap.delete(node);
        }, 500);

        // 存储新的定时器 ID
        nodeTimeoutMap.set(node, timeoutId);
    }

    (async () => {
        blockTrackMain();
    })();

    // 外观模式渐变切换
    (async () => {
        const root = document.documentElement; // 获取 :root 元素
        let lastThemeMode = root.getAttribute('data-theme-mode');

        function initRootObserver() {
            let overlayTimer;
            const rootObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme-mode') {
                        // 读取 data-theme-mode 属性的值
                        const currentThemeMode = root.getAttribute('data-theme-mode');

                        // 将上一次的值写入 whisper-last-theme-mode 属性
                        if (lastThemeMode) {
                            root.setAttribute('whisper-last-theme-mode', lastThemeMode);
                        }

                        // 遮罩维持 1s
                        if (overlayTimer) {
                            clearTimeout(overlayTimer);
                        }
                        root.setAttribute('whisper-overlay', 'true');
                        overlayTimer = setTimeout(() => {
                            root.setAttribute('whisper-overlay', 'false');
                        }, 1000);

                        // 更新 lastThemeMode 为当前值
                        lastThemeMode = currentThemeMode;
                    }
                });
            });

            // 配置观察者，监听属性变化
            rootObserver.observe(root, {
                attributes: true // 只监听属性变化
            });
        }

        // 如果 :root 元素不存在 whisper-last-theme-mode 属性，则开始监听属性变化(只添加一次监听，并且不停止)
        if (!root.hasAttribute('whisper-last-theme-mode')) {
            // 给 :root 元素添加属性
            root.setAttribute('whisper-last-theme-mode', '');
            root.setAttribute('whisper-overlay', 'false');
            initRootObserver();
        }

        // 查找 head 中是否存在 id="whisperThemeSwitchStyle" 的元素
        const existingStyle = document.getElementById('whisperThemeSwitchStyle');

        // 如果不存在，则创建并添加样式(只添加一次，并且不移除)
        if (!existingStyle) {
            const style = document.createElement('style');
            style.id = 'whisperThemeSwitchStyle';
            // background-color 是 --b3-theme-surface，TODO 暗黑模式的配色做了之后要改这里
            style.innerHTML = `
            @keyframes darkFadeOut {
                from {
                    background-color: rgb(38, 38, 38);
                    opacity: .5;
                }
                to {
                    background-color: rgb(249, 238, 237);
                    opacity: 0;
                }
            }
            @keyframes lightFadeOut {
                from {
                    background-color: rgb(249, 238, 237);
                    opacity: .5;
                }
                to {
                    background-color: rgb(38, 38, 38);
                    opacity: 0;
                }
            }
            body::after {
                content: "";
                position: absolute;
                width: 100%;
                height: 100%;
                z-index: 6;
                pointer-events: none;
            }
            :root[data-theme-mode="light"][whisper-last-theme-mode="dark"][data-light-theme="Whisper"][data-dark-theme="Whisper"] body::after {
                animation: darkFadeOut 0.5s forwards;
            }
            :root[data-theme-mode="dark"][whisper-last-theme-mode="light"][data-light-theme="Whisper"][data-dark-theme="Whisper"] body::after {
                animation: lightFadeOut 0.5s forwards;
            }
            :root[whisper-overlay="false"] body::after {
                content: none;
            }
        `;
            document.head.appendChild(style);
        }
    })();
})();
