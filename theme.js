(function() {
    console.log('Whisper: loaded');

    // TODO 看看能不能直接从 windows.siyuan 获取设备类型，如果可行的话就更换下面的方法

    // 竖屏手机
    // TODO跟进 https://github.com/siyuan-note/siyuan/issues/13952 如果支持了切换界面，需要在切换界面之后重新执行被跳过的程序
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

        console.log('Whisper: unloaded');
    }

    const focusBlock = (event) => {
        let editor = document.activeElement.classList.contains('protyle-wysiwyg') ? document.activeElement : null;
        if (!editor) {
            // TODO测试 看看每种类型的块都行不行
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
    (async () => {
        if (isMobile()) return;
        // 如果已经监听了就不再重复监听
        if (document.documentElement.dataset.whisperStatus || document.documentElement.dataset.whisperDockBottom || document.documentElement.dataset.whisperLayoutDockr) return;

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
            document.documentElement.dataset.whisperStatus = targetNodeStatus.classList.contains('fn__none') ? 'hide' : 'show';
            document.documentElement.dataset.whisperDockBottom = targetNodeDockBottom.classList.contains('fn__none') ? 'hide' : 'show';
            document.documentElement.dataset.whisperLayoutDockr = targetNodeLayoutDockr.classList.contains('layout--float') ? 'float' : 'pin';

            // 创建一个回调函数，当观察到变动时执行
            const callback = function(mutationsList) {
                for(let mutation of mutationsList) {
                    const targetNode = mutation.target;
                    if (targetNode === targetNodeStatus) {
                        document.documentElement.dataset.whisperStatus = targetNodeStatus.classList.contains('fn__none') ? 'hide' : 'show';
                    } else if (targetNode === targetNodeDockBottom) {
                        document.documentElement.dataset.whisperDockBottom = targetNodeDockBottom.classList.contains('fn__none') ? 'hide' : 'show';
                    } else if (targetNode === targetNodeLayoutDockr) {
                        document.documentElement.dataset.whisperLayoutDockr = targetNodeLayoutDockr.classList.contains('layout--float') ? 'float' : 'pin';
                    }
                }
            };

            const cssObserver = new MutationObserver(callback);

            // 传入目标节点和观察选项
            cssObserver.observe(targetNodeStatus, { attributeFilter: ['class'] });
            cssObserver.observe(targetNodeDockBottom, { attributeFilter: ['class'] });
            cssObserver.observe(targetNodeLayoutDockr, { attributeFilter: ['class'] });
        };

        // 启动重试机制
        retryIntervalId = setInterval(findTargetNodes, retryInterval);
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
        if (tooltipElement.dataset?.whisperTooltip === data) {
            tooltipElement.dataset.whisperTooltip = "";
        }
    };

    // 判断元素是否需要添加特定属性。原生的 showTooltip() 会覆盖掉类名，改成添加 data-* 属性就不会冲突了
    const updateTooltipData = (event) => {
        if (!event.target || event.target.nodeType === 9) return;
        const e = event.target.nodeType === 3 ? event.target.parentElement : event.target;

        // 按照触发频率排序

        // 文档树
        const doc = e.closest('[data-type="navigation-file"]');
        if (doc) {
            removeTooltipData("href");
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
    // TODO跟进 https://github.com/siyuan-note/siyuan/pull/13966 PR 合并后才能用这个功能，不过没合并之前也几乎不会有问题，会执行 else 分支
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
                } else if ( // TODO功能 需要给原生 PR 一个菜单的 data-name="tab-header" 属性来简化判断逻辑
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

    const AddResizeMoveToSearchTip = (node) => {
        node.querySelectorAll('.search__tip').forEach(e => {
            addResizeMoveToSearchTip(e);
        });
    }

    // 处理 弹出模态窗口
    let searchAssetsObserver;
    const handleDialogOpen = (node) => {
        const dialogKey = node.dataset.key;
        // 搜索窗口
        if (dialogKey === "dialog-globalsearch" || dialogKey === "dialog-search") {
            searchTipElement = [];
            AddResizeMoveToSearchTip(node);

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
                                    addResizeMoveToSearchTip(node);
                                    searchAssetsObserver?.disconnect();
                                }
                            });
                        });
                    });

                    // 开始监听 #searchAssets 元素的子节点变化
                    searchAssetsObserver.observe(searchAssetsElement, { childList: true });
                } else {
                    // 如果有子元素，直接处理现有的子元素
                    AddResizeMoveToSearchTip(searchAssetsElement);
                }
            }
        }
    };

    let bodyObserver, searchTipElement = [];
    // 功能：监听 body 元素的子元素增删
    (async () => {
        if (isMobile()) return;

        // 启用主题时可能已经打开了窗口，预先处理
        AddResizeMoveToSearchTip(document);

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
})();
