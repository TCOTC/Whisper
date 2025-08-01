// oxlint-disable no-unused-vars
// 重构为 TypeScript 前的 JS 代码，用于查看 Git 历史

(function() {
    console.log('Whisper: loaded');

    // 功能 看看能不能直接从 windows.siyuan 获取设备类型，如果可行的话就更换下面的方法

    // 竖屏手机
    // 跟进 https://github.com/siyuan-note/siyuan/issues/13952 如果支持了切换界面，需要在切换界面之后重新执行被跳过的程序
    const isMobile = () => {
        return !!window.siyuan?.mobile;
    };

    // Windows 系统
    const isWindows = () => {
        return navigator.platform.toUpperCase().indexOf("WIN") > -1;
    };

    // Mac 系统
    const isMac = () => {
        return navigator.platform.toUpperCase().indexOf("MAC") > -1;
    };

    // 添加设备类型标识
    (async () => {
        if (isMobile()) {
            document.body.dataset.whisperDevice = "mobile";
        } else if (isMac()) {
            document.body.dataset.whisperDevice = "mac";
        } else if (isWindows()) {
            document.body.dataset.whisperDevice = "windows";
        }
    })();

    // 关闭或卸载主题
    window.destroyTheme = () => {
        // 移除设备类型标识
        document.body.removeAttribute("data-whisper-device");

        // 给光标所在块添加属性 data-whisper-block-focus
        document.querySelectorAll('[data-whisper-block-focus]').forEach((element) => delete element.dataset.whisperBlockFocus); // 移除添加的属性
        document.removeEventListener('mouseup', focusBlock, true); // 卸载事件监听器
        document.removeEventListener('keyup', focusBlock, true);
        document.removeEventListener('dragend', focusBlock, true);

        // 监听元素状态。通过给 html 添加属性来代替使用 :has 选择器，提高性能
        clearInterval(retryIntervalId);
        elementObserver?.disconnect();
        setTimeout(() => {
            // 3 秒后检查当前主题是否为 Whisper，如果不是则移除主题添加的属性
            // 留 3 秒是为了确保主题在明亮和暗黑模式之间切换之后，依赖这些属性的样式不变
            const mode = document.documentElement.getAttribute("data-theme-mode");
            const lightTheme = document.documentElement.getAttribute("data-light-theme");
            const darkTheme = document.documentElement.getAttribute("data-dark-theme");
            if ((mode === "light" && lightTheme !== "Whisper") || (mode === "dark" && darkTheme !== "Whisper")) {
                document.documentElement.removeAttribute("data-whisper-status");
                document.documentElement.removeAttribute("data-whisper-dock-left");
                document.documentElement.removeAttribute("data-whisper-dock-right");
                document.documentElement.removeAttribute("data-whisper-dock-bottom");
                document.documentElement.removeAttribute("data-whisper-layout-dockl");
                document.documentElement.removeAttribute("data-whisper-layout-dockl-float");
                document.documentElement.removeAttribute("data-whisper-layout-dockr");
                document.documentElement.removeAttribute("data-whisper-layout-dockr-float");
            }
        }, 3000);

        // 鼠标悬浮在特定元素上时，给当前显示的 tooltip 添加特定属性
        document.removeEventListener('mouseover', updateTooltipData);
        tooltipElement?.removeAttribute("data-whisper-tooltip");
        tooltipElement = null;

        // 监听 #commonMenu 菜单
        commonMenuObserver?.disconnect();
        commonMenu?.removeEventListener('click', handleMenuClick, true);
        commonMenu = null;
        whisperCommonMenu?.remove();

        // 处理 弹出模态窗口
        searchAssetsObserver?.disconnect();

        // 监听 body 元素的子元素增删
        bodyObserver?.disconnect();
        searchTipElement.forEach((element) => element?.classList.remove("resize__move"));
        searchTipElement = null;

        // 取消绑定思源事件总线
        removeMyTheme();

        console.log('Whisper: unloaded');
    }

    const focusBlock = (event) => {
        let editor = document.activeElement.classList.contains('protyle-wysiwyg') ? document.activeElement : null;
        if (!editor) {
            // 测试 看看每种类型的块都行不行
            // 光标在表格块内
            editor = document.activeElement.tagName === 'TABLE' ? document.activeElement.closest('.protyle-wysiwyg') : null;
        }
        if (!editor) return; // 焦点不在编辑器内就直接返回

        // 编辑器内有选中块时不必凸显聚焦块，清除属性后返回
        if (editor?.querySelector(`.protyle-wysiwyg--select`)) {
            // 清除当前编辑器内所有块上的属性
            editor.querySelectorAll('[data-whisper-block-focus]').forEach((element) => delete element.dataset.whisperBlockFocus);
            return;
        }

        // 优先获取光标所在块，其次获取点击的元素所在块（例如数据库元素对应的数据库块）
        const block = window.getSelection()?.anchorNode?.parentElement?.closest('[data-node-id]') || event.target.closest('[data-node-id]'); // 光标在选区前面，所以用 anchorNode
        // 当前块已经设置属性 时直接返回
        if (block?.hasAttribute('data-whisper-block-focus')) return;

        // 清除当前编辑器内非聚焦块上的属性
        editor.querySelectorAll('[data-whisper-block-focus]').forEach((element) => delete element.dataset.whisperBlockFocus);
        // 光标不在块内 / 点击的元素在嵌入块内 时，清除当前编辑器内非聚焦块上的属性后返回
        if (!block || block?.closest('.protyle-wysiwyg__embed')) return;

        block.dataset.whisperBlockFocus = "";
    };

    // 功能：给光标所在块添加属性 data-whisper-block-focus
    // 需要在捕获阶段触发，避免停止冒泡导致无法监听到
    document.addEventListener('mouseup', focusBlock, true); // 按下按键之后
    document.addEventListener('keyup', focusBlock, true);   // 鼠标点击之后
    document.addEventListener('dragend', focusBlock, true); // 拖拽块之后

    // 功能：监听元素状态。通过给 html 添加属性来代替使用 :has 选择器，提高性能
    let retryIntervalId;
    let elementObserver;
    (async () => {
        if (isMobile()) return;

        // 定义需要查找的目标节点配置
        const targets = [
            {
                selector: '#status',
                checks: [
                    {
                        datasetProp: 'whisperStatus',
                        attributeFilter: 'class',
                        check: el => el.classList.contains('fn__none'),
                        stateMap: { true: 'hide', false: 'show' }
                    }
                ],
                found: false,
                timedOut: false,
                element: null
            },
            {
                selector: '#dockLeft',
                checks: [
                    {
                        datasetProp: 'whisperDockLeft',
                        attributeFilter: 'class',
                        check: el => el.classList.contains('fn__none'),
                        stateMap: { true: 'hide', false: 'show' }
                    }
                ],
                found: false,
                timedOut: false,
                element: null
            },
            {
                selector: '#dockRight',
                checks: [
                    {
                        datasetProp: 'whisperDockRight',
                        attributeFilter: 'class',
                        check: el => el.classList.contains('fn__none'),
                        stateMap: { true: 'hide', false: 'show' }
                    }
                ],
                found: false,
                timedOut: false,
                element: null
            },
            {
                selector: '#dockBottom',
                checks: [
                    {
                        datasetProp: 'whisperDockBottom',
                        attributeFilter: 'class',
                        check: el => el.classList.contains('fn__none'),
                        stateMap: { true: 'hide', false: 'show' }
                    }
                ],
                found: false,
                timedOut: false,
                element: null
            },
            {
                selector: '.layout__dockl',
                checks: [
                    {
                        datasetProp: 'whisperLayoutDockl',
                        attributeFilter: 'style',
                        check: el => el.style.width === '0px',
                        stateMap: { true: 'hide', false: 'show' }
                    },
                    {
                        datasetProp: 'whisperLayoutDocklFloat',
                        attributeFilter: 'class',
                        check: el => el.classList.contains('layout--float'),
                        stateMap: { true: 'float', false: 'pin' }
                    }
                ],
                found: false,
                timedOut: false,
                element: null
            },
            {
                selector: '.layout__dockr',
                checks: [
                    {
                        datasetProp: 'whisperLayoutDockr',
                        attributeFilter: 'style',
                        check: el => el.style.width === '0px',
                        stateMap: { true: 'hide', false: 'show' }
                    },
                    {
                        datasetProp: 'whisperLayoutDockrFloat',
                        attributeFilter: 'class',
                        check: el => el.classList.contains('layout--float'),
                        stateMap: { true: 'float', false: 'pin' }
                    }
                ],
                found: false,
                timedOut: false,
                element: null
            }
        ];

        // 如果所有目标节点都已存在对应 dataset 属性则直接返回
        if (targets.every(target => target.found)) return;

        // 重试机制配置
        const retryInterval = 100; // 重试间隔时间，单位：毫秒
        const maxRetries = 50; // 最大重试次数
        let retryCount = 0;

        // 创建一个 MutationObserver 实例来观察所有目标节点的变化
        elementObserver = new MutationObserver(mutationsList => {
            for (let mutation of mutationsList) {
                const targetNode = mutation.target;
                // 找出对应的目标节点配置
                const target = targets.find(t => t.element === targetNode);
                if (!target) continue;

                // 更新所有相关的 dataset 属性
                target.checks.forEach(check => {
                    if (check.attributeFilter === mutation.attributeName) {
                        const checkResult = check.check(targetNode);
                        document.documentElement.dataset[check.datasetProp] = check.stateMap[checkResult];
                    }
                });
            }
        });

        // 设置单个目标节点的观察
        const setupObserver = (target) => {
            if (!target.element) return;

            // 初始设置所有 dataset 状态
            target.checks.forEach(check => {
                const checkResult = check.check(target.element);
                document.documentElement.dataset[check.datasetProp] = check.stateMap[checkResult];
            });

            // 开始观察该节点的所有相关属性变化
            const attributesToObserve = [...new Set(target.checks.map(check => check.attributeFilter))];
            elementObserver.observe(target.element, {
                attributes: true,
                attributeFilter: attributesToObserve
            });
        };

        // 重试查找目标节点
        const findTargetNodes = () => {
            retryCount++;
            let hasRemainingTargets = false;

            targets.forEach(target => {
                // 如果已经找到或已超时，跳过
                if (target.found || target.timedOut) return;

                // 查找目标节点
                const element = document.querySelector(target.selector);
                if (element) {
                    // 找到该节点
                    target.element = element;
                    target.found = true;
                    setupObserver(target); // 设置观察和初始状态
                } else if (retryCount >= maxRetries) {
                    // 达到最大重试次数仍未找到
                    target.timedOut = true;
                    console.error(`Whisper: failed to find target node: ${target.selector}`);
                } else {
                    // 继续重试
                    hasRemainingTargets = true;
                }
            });

            // 如果所有节点都处理完毕或达到最大重试次数，停止定时器
            if (!hasRemainingTargets || retryCount >= maxRetries) {
                clearInterval(retryIntervalId);
            }
        };

        // 启动重试机制
        retryIntervalId = setInterval(findTargetNodes, retryInterval);
        // 立即执行一次查找
        findTargetNodes();
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

        if (isWindows()) {
            const colonIdx = link.indexOf(":");
            return 1 === colonIdx; // 冒号前面只有一个字符认为是 Windows 盘符而不是网络协议
        }
        return link.startsWith("/");
    };

    // 给 tooltip 元素添加 data-whisper-tooltip 属性值
    const setTooltipData = (data, display) => {
        if (tooltipElement.dataset?.whisperTooltip !== data) {
            tooltipElement.dataset.whisperTooltip = data;
        }
        if (display) {
            // 设置 tooltip 元素的 display 属性
            // display:flex 用于普通链接和页签提示淡出。样式会被原生的 messageElement.removeAttribute("style"); 方法移除，不需要管理
            const tooltipStyle = tooltipElement.getAttribute('style');
            tooltipElement.setAttribute('style', `${tooltipStyle} display: flex !important`);
        } else {
            tooltipElement.style.removeProperty('display');
        }
    };

    // 移除 tooltip 元素的特定 data-whisper-tooltip 属性值
    const removeTooltipData = (data) => {
        if (!data || tooltipElement.dataset?.whisperTooltip === data) {
            tooltipElement.dataset.whisperTooltip = "";
        }
    };

    // 判断元素是否需要添加特定属性。原生的 showTooltip() 会覆盖掉类名，改成添加 data-* 属性就不会冲突了
    const updateTooltipData = (event) => {
        if (!event.target || event.target.nodeType === 9) return;
        const e = event.target.nodeType === 3 ? event.target.parentElement : event.target;

        // 按照触发频率排序

        // 文档树
        // 跟进 文档信息显示在左下角的问题还是没解决，估计是思源本体的问题：鼠标划过笔记本之后 tooltip 不隐藏 https://github.com/siyuan-note/siyuan/issues/14823
        //  到时候把这部分代码注释掉测试看看还会不会有问题
        const doc = e.closest('[data-type="navigation-file"]');
        if (doc) {
            removeTooltipData();
        }

        // 文本超链接
        const href = e.getAttribute("data-href")
        if (href) {
            // 资源文件链接
            if (isLocalPath(href)) {
                setTooltipData("href_asset");
                return;
            }
            // 普通链接
            setTooltipData("href", true);
            return;
        }

        // 页签
        if (e.closest('[data-type="tab-header"]')) {
            setTooltipData("tab_header", true);
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
    // 跟进 https://github.com/siyuan-note/siyuan/pull/13966 PR 合并后才能用这个功能，不过没合并之前也几乎不会有问题，会执行 else 分支
    let tooltipElement;
    (async () => {
        if (isMobile()) return;

        tooltipElement = document.getElementById("tooltip");
        if (tooltipElement) {
            // 参考原生的 initBlockPopover 函数
            document.addEventListener('mouseover', updateTooltipData);
        } else {
            console.error("Whisper: tooltip element does not exist.");
        }
    })();

    // 功能：切换外观模式时背景动画
    const themeSwitchAnimation = (e) => {
        // 如果不支持 View Transitions API 就直接返回
        if (!document.startViewTransition) {
            console.error('Whisper: View Transitions API is not supported');
            return;
        }

        const { themeLight, themeDark, themeOS } = window.siyuan.languages;

        // 获取切换后的模式（通过点击的按钮判断）
        let targetMode = e.target.closest(".b3-menu__item").textContent;
        if (targetMode === themeOS) {
            // 如果点击了“跟随系统”，则切换后的模式是系统模式
            targetMode = window.matchMedia('(prefers-color-scheme: light)').matches ? themeLight : themeDark;
        }

        // 当前模式
        const currentMode = window.siyuan.config.appearance.mode === 0 ? themeLight : themeDark;
        // 如果切换后的模式不变，则跳过
        if (targetMode === currentMode) return;

        // 获取切换后的主题（切换后的模式对应的主题）
        const targetTheme = targetMode === themeLight ? window.siyuan.config.appearance.themeLight : window.siyuan.config.appearance.themeDark;
        // 如果切换后的主题不是 Whisper，则跳过
        if (targetTheme !== "Whisper") return;

        const transition = document.startViewTransition();

        const x = e.clientX;
        const y = e.clientY;

        const targetRadius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        const style = document.createElement("style");
        style.innerHTML = `::view-transition-old(root),::view-transition-new(root){animation: none;}`;
        document.head.appendChild(style);

        transition.ready.then(() => {
            const animation = document.documentElement.animate(
                {
                    clipPath: [
                        `circle(0 at ${x}px ${y}px)`,
                        `circle(${targetRadius}px at ${x}px ${y}px)`
                    ]
                },
                {
                    duration: 550,
                    pseudoElement: '::view-transition-new(root)',
                    easing: 'ease-in-out'
                }
            );

            // 过程中点击，立即结束动画
            document.addEventListener('click', () => {
                animation.finish();
            }, { once: true }); // 事件只触发一次

            // 动画结束后需要延迟一点移除 style 元素，否则会闪烁
            animation.onfinish = () => {
                setTimeout(() => {style?.remove();}, 500);
            };
        });
    };

    // 功能：页签右键菜单中的多个“关闭”选项移到二级菜单
    const handleTabClose = () => {
        const closeMenu = commonMenu.querySelector('[data-id="close"]');
        if (!closeMenu) return;

        const clonedCloseMenu = closeMenu.cloneNode(true);
        clonedCloseMenu.querySelector('.b3-menu__icon')?.remove(); // 克隆选项移除图标

        closeMenu.querySelector('.b3-menu__accelerator')?.remove(); // 选项移除快捷键
        // 添加图标和子菜单容器
        closeMenu.insertAdjacentHTML('beforeend', `<svg class="b3-menu__icon b3-menu__icon--small"><use xlink:href="#iconRight"></use></svg><div class="b3-menu__submenu"><div class="b3-menu__items"></div></div>`);
        const submenuItems = closeMenu.querySelector('.b3-menu__items');

        // 克隆选项添加到子菜单中
        submenuItems.appendChild(clonedCloseMenu);

        // 移动其他关闭选项到子菜单中
        commonMenu.querySelectorAll('[data-id="closeOthers"], [data-id="closeAll"], [data-id="closeUnmodified"], [data-id="closeLeft"], [data-id="closeRight"]').forEach(element => {
            element.querySelector('.b3-menu__icon')?.remove(); // 移除空图标
            submenuItems.appendChild(element); // 移动元素到子菜单
        });

        // 给分屏选项添加图标
        const splitMenu = commonMenu.querySelector('[data-id="split"] > .b3-menu__icon > use');
        if (splitMenu) {
            splitMenu.setAttribute("xlink:href", "#iconSplitLR");
        }
    };

    // 处理 #commonMenu 菜单的点击事件
    const handleMenuClick = (e) => {
        switch (commonMenuType) {
            case "barmode":
                themeSwitchAnimation(e);
                break;
        }

    }

    // 功能：监听 #commonMenu 菜单
    let commonMenuObserver, commonMenu, whisperCommonMenu, commonMenuType;
    (async () => {
        if (isMobile()) return;

        commonMenuObserver = new MutationObserver((mutations) => {
            // 使用一个标志位来确保只处理一次
            let processed = false;

            mutations.forEach(() => {
                if (processed) return; // 如果已经处理过，直接返回

                // 先卸载监听再添加，避免重复添加
                commonMenu.removeEventListener('click', handleMenuClick, true);
                whisperCommonMenu.dataset.name = "";

                if (commonMenu.getAttribute("data-name") === "barmode") {
                    commonMenuType = "barmode";
                    commonMenu.addEventListener('click', handleMenuClick, true)
                } else if ( // 功能 需要给原生 PR 一个菜单的 data-name="tab-header" 属性来简化判断逻辑
                    commonMenu.querySelector('[data-id="close"]') &&
                    commonMenu.querySelector('[data-id="split"]') &&
                    commonMenu.querySelector('[data-id="copy"]') &&
                    commonMenu.querySelector('[data-id="tabToWindow"]')
                ) {
                    whisperCommonMenu.dataset.name = "tab-header";
                    handleTabClose();
                }

                processed = true; // 标记为已处理
            });
        });

        // 监听菜单的属性变化
        commonMenu = document.getElementById("commonMenu");
        commonMenu.insertAdjacentHTML('beforebegin', '<div id="whisperCommonMenu"></div>');
        whisperCommonMenu = document.getElementById("whisperCommonMenu");
        commonMenuObserver.observe(commonMenu, { attributes: true });
    })();

    const addResizeMoveToSearchTip = (e) => {
        e.classList.add("resize__move");
        searchTipElement.push(e);
    }

    const AddResizeMoveToSearchDialog = (node, isDocument) => {
        node.querySelectorAll('.search__tip').forEach(e => {
            addResizeMoveToSearchTip(e);
        });
        if (isDocument) {
            node.querySelectorAll('[data-key="dialog-globalsearch"] .fn__flex-column > .block__icons').forEach(e => {
                addResizeMoveToSearchTip(e);
            });
        } else {
            node.querySelectorAll('.fn__flex-column > .block__icons').forEach(e => {
                addResizeMoveToSearchTip(e);
            });
        }
    }

    // 处理 弹出模态窗口
    let searchAssetsObserver;
    const handleDialogOpen = (node) => {
        const dialogKey = node.dataset.key;
        // 搜索窗口
        if (dialogKey === "dialog-globalsearch" || dialogKey === "dialog-search") {
            searchTipElement = [];
            AddResizeMoveToSearchDialog(node);

            // `搜索资源文件内容` 窗口的子元素在打开之前是不存在的，所以需要监听到子元素添加之后再添加类名
            // 查找 #searchAssets 元素
            const searchAssetsElement = document.getElementById('searchAssets');

            if (searchAssetsElement) {
                // 如果 #searchAssets 元素存在，检查是否有子元素
                if (searchAssetsElement.children.length === 0) {
                    // 如果没有子元素，监听子元素的添加
                    searchAssetsObserver = new MutationObserver((mutationsList) => {
                        mutationsList.forEach((mutation) => {
                            mutation.addedNodes.forEach((node) => {
                                if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('search__tip')) {
                                    AddResizeMoveToSearchDialog(searchAssetsElement);
                                    searchAssetsObserver?.disconnect();
                                }
                            });
                        });
                    });

                    // 开始监听 #searchAssets 元素的子节点变化
                    searchAssetsObserver.observe(searchAssetsElement, { childList: true });
                } else {
                    // 如果有子元素，直接处理现有的子元素
                    AddResizeMoveToSearchDialog(searchAssetsElement);
                }
            }
        }
    };

    let bodyObserver, searchTipElement = [];
    // 功能：监听 body 元素的子元素增删
    (async () => {
        if (isMobile()) return;

        // 启用主题时可能已经打开了窗口，预先处理
        AddResizeMoveToSearchDialog(document, true);

        // 监听 body 元素的直接子元素变化
        bodyObserver = new MutationObserver((mutationsList) => {
            mutationsList.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        setTimeout(() => {
                            // 弹出模态窗口
                            if (node.classList.contains('b3-dialog--open')) {
                                handleDialogOpen(node);
                            }
                        });
                    }
                });
            });
        });

        // 观察 body 元素子节点的变化
        bodyObserver.observe(document.body, { childList: true });
    })();

    // 功能：移动端补上 AI 配置选项（国内应用商店渠道）
    (async () => {
        if (isMobile()) {
            const mobileMenu = document.getElementById("menu");
            if (!mobileMenu) {
                console.error("Whisper: mobileMenu element does not exist.");
                return;
            }

            // 监听 mobileMenu 元素，直到 menuRiffCard 元素存在
            const observer = new MutationObserver((mutationsList, observer) => {
                const mobileRiffCardMenu = document.getElementById("menuRiffCard");
                if (mobileRiffCardMenu) {
                    // 找到 menuRiffCard 元素后，停止监听
                    observer.disconnect();

                    const mobileAiMenu = document.getElementById("menuAI");
                    if (!mobileAiMenu) {
                        const aiHTML = `<div class="b3-menu__item${window.siyuan.config.readonly ? " fn__none" : ""}" id="menuAI">
                            <svg class="b3-menu__icon"><use xlink:href="#iconSparkles"></use></svg><span class="b3-menu__label">AI</span>
                        </div>`;
                        // 插入 AI 选项
                        mobileRiffCardMenu.insertAdjacentHTML('afterend', aiHTML);
                    }
                }
            });

            // 开始监听 mobileMenu 的子元素变化
            observer.observe(mobileMenu, { childList: true, subtree: true });

            // 设置超时时间，一分钟后停止监听并报错
            setTimeout(() => {
                const mobileRiffCardMenu = document.getElementById("menuRiffCard");
                if (!mobileRiffCardMenu) {
                    observer.disconnect();
                    console.error("Whisper: menuRiffCard element does not exist.");
                }
            }, 60000); // 1 分钟超时
        }
    })();

    // 绑定思源事件总线（eventBus） https://ld246.com/article/1746977623250
    function eventBusOn(eventName, callback) {
        const plugin = getMyTheme();
        plugin.eventBus.on(eventName, callback);
    }
    function eventBusOff(eventName, callback) {
        const plugin = getMyTheme();
        plugin.eventBus.off(eventName, callback);
    }

    function getMyTheme(themeName = "whisper-theme") {
        let myTheme = window.siyuan.ws.app.plugins.find(item=>item.name === themeName);
        if(myTheme) return myTheme;
        class EventBus {
            constructor(name = "") {
                this.eventTarget = document.createComment(name);
                document.appendChild(this.eventTarget);
            }
            on(type, listener) {
                this.eventTarget.addEventListener(type, listener);
            }
            once(type, listener) {
                this.eventTarget.addEventListener(type, listener, { once: true });
            }
            off(type, listener) {
                this.eventTarget.removeEventListener(type, listener);
            }
            emit(type, detail) {
                return this.eventTarget.dispatchEvent(new CustomEvent(type, { detail, cancelable: true }));
            }
        }
        class Theme {
            constructor(options) {
                this.app = options.app || window.siyuan.ws.app.appId;
                this.i18n = options.i18n;
                this.displayName = options.displayName || options.name;
                this.name = options.name;
                this.eventBus = new EventBus(options.name);
                this.protyleSlash = [];
                this.customBlockRenders = {};
                this.topBarIcons = [];
                this.statusBarIcons = [];
                this.commands = [];
                this.models = {};
                this.docks = {};
                this.data = {};
                this.protyleOptionsValue = null;
            }
            onload() {}
            onunload() {}
            uninstall() {}
            async updateCards(options) { return options; } // 返回选项本身
            onLayoutReady() {}
            addCommand(command) {}
            addIcons(svg) {}
            addTopBar(options) { return null; } // 模拟返回null
            addStatusBar(options) { return null; } // 模拟返回null
            // 去掉设置，参考 https://github.com/siyuan-note/siyuan/blob/dae6158860cc704e353454565c96e874278c6f47/app/src/plugin/openTopBarMenu.ts#L25
            // 不去掉的话会在右上角的插件菜单添加一个选项
            // openSetting() {}
            loadData(storageName) { return Promise.resolve(null); }
            saveData(storageName, data) { return Promise.resolve(); }
            removeData(storageName) { return Promise.resolve(); }
            getOpenedTab() { return {}; } // 返回空对象
            addTab(options) { return () => {}; } // 返回空函数模拟模型
            addDock(options) { return {}; } // 返回空对象模拟 dock
            addFloatLayer(options) {}
            updateProtyleToolbar(toolbar) { return toolbar; } // 返回 toolbar 本身，否则不显示工具栏 https://github.com/TCOTC/Whisper/issues/8
            set protyleOptions(options) {}
            get protyleOptions() { return this.protyleOptionsValue; }
        }
        myTheme = new Theme({name:themeName});
        window.siyuan.ws.app.plugins.push(myTheme);
        return myTheme;
    }

    eventBusOn("loaded-protyle-static", eventBusHandler)

    function removeMyTheme(themeName = "whisper-theme") {
        eventBusOff("loaded-protyle-static", eventBusHandler)

        const index = window.siyuan.ws.app.plugins.findIndex(item => item.name === themeName);
        if (index > -1) {
            window.siyuan.ws.app.plugins.splice(index, 1); // 移除插件
        }
    }

    // 处理思源事件
    function eventBusHandler(args) {
        if (args.type === "loaded-protyle-static") {
            // 编辑器加载完成
            const wysiwyg = args.detail.protyle.wysiwyg.element;
            // 功能：聚焦折叠的列表项时自动展开 https://ld246.com/article/1748934188341
            // 原理：只使用 CSS 覆盖的话，块标不会改变，因此要用 JS；移除列表项块的 fold="1" 属性之后，编辑内容只影响子块，所以不会保存列表项块的展开状态
            if (wysiwyg?.dataset.docType  === "NodeListItem") {
                // 移除首个块（列表项块）的折叠状态
                wysiwyg.querySelector(":scope > [data-node-id].li")?.removeAttribute("fold");
            }
        }
    }
})();
