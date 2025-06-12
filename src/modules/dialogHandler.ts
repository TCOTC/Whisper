import { ThemeModule } from '../types';
import { isMobile } from './utils';

export class DialogHandler implements ThemeModule {
    private bodyObserver: MutationObserver | null = null;
    private searchAssetsObserver: MutationObserver | null = null;
    private searchTipElements: HTMLElement[] = [];

    /**
     * 初始化对话框处理器
     */
    public init(): void {
        if (isMobile()) return;
        
        // 启用主题时可能已经打开了窗口，预先处理
        this.addResizeMoveToSearchDialog();
        
        this.setupBodyObserver();
    }

    /**
     * 销毁对话框处理器
     */
    public destroy(): void {
        if (this.bodyObserver) {
            this.bodyObserver.disconnect();
            this.bodyObserver = null;
        }
        
        if (this.searchAssetsObserver) {
            this.searchAssetsObserver.disconnect();
            this.searchAssetsObserver = null;
        }
        
        this.searchTipElements.forEach((element) => {
            element.classList.remove("resize__move");
        });
        this.searchTipElements = [];
    }

    /**
     * 设置 body 元素观察器
     */
    private setupBodyObserver(): void {
        // 监听 body 元素的直接子元素变化
        this.bodyObserver = new MutationObserver((mutationsList) => {
            mutationsList.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        setTimeout(() => {
                            // 弹出模态窗口
                            if ((node as HTMLElement).classList.contains('b3-dialog--open')) {
                                this.handleDialogOpen(node as HTMLElement);
                            }
                        });
                    }
                });
            });
        });

        // 观察 body 元素子节点的变化
        this.bodyObserver.observe(document.body, { childList: true });
    }

    /**
     * 处理对话框打开
     */
    private handleDialogOpen(node: HTMLElement): void {
        const dialogKey = node.dataset.key;
        // 搜索窗口
        if (dialogKey === "dialog-globalsearch" || dialogKey === "dialog-search") {
            this.searchTipElements = [];
            this.addResizeMoveToSearchDialog(node);

            // `搜索资源文件内容` 窗口的子元素在打开之前是不存在的，所以需要监听到子元素添加之后再添加类名
            // 查找 #searchAssets 元素
            const searchAssetsElement = document.getElementById('searchAssets');

            if (searchAssetsElement) {
                // 如果 #searchAssets 元素存在，检查是否有子元素
                if (searchAssetsElement.children.length === 0) {
                    // 如果没有子元素，监听子元素的添加
                    this.searchAssetsObserver = new MutationObserver((mutationsList) => {
                        mutationsList.forEach((mutation) => {
                            mutation.addedNodes.forEach((node) => {
                                if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).classList.contains('search__tip')) {
                                    this.addResizeMoveToSearchDialog(searchAssetsElement);
                                    if (this.searchAssetsObserver) {
                                        this.searchAssetsObserver.disconnect();
                                        this.searchAssetsObserver = null;
                                    }
                                }
                            });
                        });
                    });

                    // 开始监听 #searchAssets 元素的子节点变化
                    this.searchAssetsObserver.observe(searchAssetsElement, { childList: true });
                } else {
                    // 如果有子元素，直接处理现有的子元素
                    this.addResizeMoveToSearchDialog(searchAssetsElement);
                }
            }
        }
    }

    /**
     * 为搜索对话框添加 resize__move 类
     */
    private addResizeMoveToSearchDialog(node: HTMLElement | Document = document): void {
        node.querySelectorAll('.search__tip').forEach(e => {
            this.addResizeMoveToSearchTip(e as HTMLElement);
        });
        
        // 判断是否为 Document 对象并使用适当的选择器
        if (node instanceof Document) {
            node.querySelectorAll('[data-key="dialog-globalsearch"] .fn__flex-column > .block__icons').forEach(e => {
                this.addResizeMoveToSearchTip(e as HTMLElement);
            });
        } else {
            node.querySelectorAll('.fn__flex-column > .block__icons').forEach(e => {
                this.addResizeMoveToSearchTip(e as HTMLElement);
            });
        }
    }

    /**
     * 为搜索提示元素添加 resize__move 类
     */
    private addResizeMoveToSearchTip(element: HTMLElement): void {
        element.classList.add("resize__move");
        this.searchTipElements.push(element);
    }
} 