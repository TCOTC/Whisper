import { ThemeModule } from '../types';
import { themeSwitch } from './themeSwitch';

export class DialogHandler implements ThemeModule {
    private bodyObserver: MutationObserver | null = null;
    private searchAssetsObserver: MutationObserver | null = null;
    private searchTipElements: HTMLElement[] = [];
    private settingDialogObserver: MutationObserver | null = null;
    private modeSelect: HTMLSelectElement | null = null;

    /**
     * 初始化对话框(Dialog)处理器
     */
    public init(): void {
        // 启用主题时如果已经打开了窗口就直接处理（比如在设置窗口里切换外观模式之后）
        document.querySelectorAll('.b3-dialog--open').forEach(element => {
            // 处理所有窗口，比如设置窗口和搜索窗口可以同时打开
            this.handleDialogOpen(element as HTMLElement);
        });

        // 观察 Dialog 生成
        this.setupBodyObserver();
    }

    /**
     * 销毁对话框(Dialog)处理器
     */
    public destroy(): void {
        this.bodyObserver?.disconnect();
        this.bodyObserver = null;
        
        this.settingDialogObserver?.disconnect();
        this.settingDialogObserver = null;
        
        this.modeSelect?.removeEventListener('change', this.handleModeChange);
        this.modeSelect = null;
        
        this.searchAssetsObserver?.disconnect();
        this.searchAssetsObserver = null;
        
        this.searchTipElements.forEach((element) => {
            element.classList.remove('resize__move');
        });
        this.searchTipElements = [];
    }

    /**
     * 设置 body 元素观察器
     */
    private setupBodyObserver(): void {
        // 监听 body 元素的直接子元素变化
        this.bodyObserver = new MutationObserver((mutationsList) => {
            mutationsList.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    
                    // 使用 setTimeout 将代码执行推迟到下一个事件循环，确保子元素已经完全渲染
                    setTimeout(() => {
                        const element = node as HTMLElement;
                        if (element.hasAttribute('data-key')) {
                            this.handleDialogOpen(element);
                        }
                    });
                });
            });
        });

        // 观察 body 元素子节点的变化
        this.bodyObserver.observe(document.body, { childList: true });
    }

    /**
     * 处理对话框(Dialog)打开
     */
    private handleDialogOpen(dialogElement: HTMLElement): void {
        switch (dialogElement.dataset.key) {
            case 'dialog-setting':
                // 设置窗口，切换外观模式
                this.setupThemeChangeListener(dialogElement);
                break;
            case 'dialog-globalsearch':
            case 'dialog-search':
                // 搜索窗口，添加 resize__move 类
                this.handleSearchDialog(dialogElement);
                break;
            default:
                return;
        }
    }

    /**
     * 设置主题切换监听器
     */
    private setupThemeChangeListener(settingDialogElement: HTMLElement): void {
        // 检查 #mode 元素是否已经存在
        const existingModeSelect = settingDialogElement.querySelector('#mode') as HTMLSelectElement;
        if (existingModeSelect) {
            this.attachModeChangeListener(existingModeSelect);
            return;
        }

        // 如果 #mode 元素不存在，使用 MutationObserver 监听动态内容加载
        this.settingDialogObserver = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                // 检查新添加的节点
                for (const addedNode of mutation.addedNodes) {
                    if (addedNode.nodeType !== Node.ELEMENT_NODE) continue;
                    
                    const element = addedNode as HTMLElement;
                    
                    // 检查添加的元素本身是否是 #mode
                    if (element.id === 'mode') {
                        this.settingDialogObserver?.disconnect();
                        this.attachModeChangeListener(element as HTMLSelectElement);
                        return;
                    }
                    
                    // 检查添加的元素的子元素中是否包含 #mode
                    const modeSelect = element.querySelector('#mode') as HTMLSelectElement;
                    if (modeSelect) {
                        this.settingDialogObserver?.disconnect();
                        this.attachModeChangeListener(modeSelect);
                        return;
                    }
                }
            }
        });

        // 开始监听对话框内容的变化
        this.settingDialogObserver.observe(settingDialogElement, {childList: true, subtree: true});
    }

    /**
     * 为模式选择器附加变化监听器
     */
    private attachModeChangeListener(modeSelect: HTMLSelectElement): void {
        this.modeSelect?.removeEventListener('change', this.handleModeChange);
        
        this.modeSelect = modeSelect;
        this.modeSelect.addEventListener('change', this.handleModeChange);
    }

    /**
     * 处理模式选择器的变化事件
     */
    private handleModeChange = (event: Event) => {
        const target = event.target as HTMLSelectElement;
        if (target && target.id === 'mode') {
            // 获取元素的位置信息
            const rect = target.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2 + 30; // 偏移到下拉菜单中
            
            // 将事件转换为 MouseEvent 以兼容 themeSwitch 函数的参数要求
            const mouseEvent = new MouseEvent('click', {
                clientX: centerX,
                clientY: centerY,
                bubbles: true,
                cancelable: true
            });
            
            // 将原始事件的目标设置到 mouseEvent 上
            Object.defineProperty(mouseEvent, 'target', {
                value: target,
                enumerable: true
            });

            themeSwitch('dialog', mouseEvent);
        }
    };

    /**
     * 处理搜索对话框
     * @param dialogElement 对话框元素
     */
    private handleSearchDialog(dialogElement: HTMLElement): void {
        this.searchTipElements = [];
        this.addResizeMoveToSearchDialog(dialogElement);

        // `搜索资源文件内容` 窗口的子元素在打开之前是不存在的，所以需要监听到子元素添加之后再添加类名
        // 查找 #searchAssets 元素
        const searchAssetsElement = document.getElementById('searchAssets');
        if (!searchAssetsElement) return;

        // 如果有子元素，直接处理现有的子元素
        if (searchAssetsElement.children.length > 0) {
            this.addResizeMoveToSearchDialog(searchAssetsElement);
            return;
        }

        // 如果没有子元素，监听子元素的添加
        this.searchAssetsObserver = new MutationObserver((mutationsList) => {
            mutationsList.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;
                    if (!(node as HTMLElement).classList.contains('search__tip')) return;

                    this.searchAssetsObserver?.disconnect();
                    this.searchAssetsObserver = null;
                    this.addResizeMoveToSearchDialog(searchAssetsElement);
                });
            });
        });

        // 开始监听 #searchAssets 元素的子节点变化
        this.searchAssetsObserver.observe(searchAssetsElement, { childList: true });
    }

    /**
     * 为搜索对话框中的元素添加 resize__move 类
     */
    private addResizeMoveToSearchDialog(node: HTMLElement): void {
        node.querySelectorAll('.search__tip, .fn__flex-column > .block__icons').forEach(element => {
            element.classList.add('resize__move');
            this.searchTipElements.push((element as HTMLElement));
        });
    }
} 