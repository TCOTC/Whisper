### CSS 部分

```css
/* ————————————————————悬浮提示———————————————————— */

.tooltip {
    box-shadow: 0 0 0 1px rgba(0,0,0,.1),0 2px 6px 0 rgba(0,0,0,.1);
    background-color: var(--mix-theme_primary_background);
    color: var(--b3-theme-on-background);
    animation-duration: 10ms; /* 默认动画 zoomIn 更快过渡 */
    animation-delay: 400ms;   /* 延迟显示 */
    pointer-events: none;
}
/* 路径信息的悬浮提示统一显示在左下角 */
@keyframes tooltipFadeOut {
    to {
        opacity: 0;
    }
}
.tooltip--tab_header,
.tooltip--href {
    overflow: hidden;        /* 隐藏超出元素宽度的内容 */
    text-overflow: ellipsis; /* 使用省略号表示被截断的文本 */
    white-space: nowrap;     /* 不换行 */
    position: absolute;      /* 显示在左下角 */
    top: unset !important;
    left: 0 !important;
    bottom: 0 !important;
    border-radius:0 6px 0 0;
    max-width: 350px;        /* 初始链接宽度(小于这个宽度的情况下字体会变细，很怪) */
    animation-name: none;    /* 禁用动画，直接显示 */
    animation-fill-mode: both;
}
.tooltip__wider {
    max-width: 1000px;       /* 最大链接宽度 */
    transition: max-width 0.2s 0.5s; /* 过渡动画 */
}
.tooltip--tab_header.fn__none,
.tooltip--href.fn__none {
    display: block !important; /* 保持显示直到淡出 */
    animation-name: tooltipFadeOut;
    animation-duration: 300ms;
    animation-delay: 200ms;
    /*animation-fill-mode: both;*/
    max-width: 1001px;         /* 能够使元素添加 .fn__none 之后宽度不变(用于宽度刚好展开一半的情况) */
    transition: max-width 0s 2s;
}
```

### 代码部分

```typescript
(function() {
    let tooltipObserver: MutationObserver;

    window.destroyTheme = () => {
        // 停止监听 .tooltip--href 的更新
        if (tooltipObserver) {
            tooltipObserver.disconnect();
        }
    }

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
})();
```