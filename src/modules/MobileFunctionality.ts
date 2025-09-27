import { ThemeModule } from '../types';
import { logging } from './logger';

export class MobileFunctionality implements ThemeModule {
    private observer: MutationObserver | null = null;

    /**
     * 初始化移动端 AI 按钮
     */
    public init(): void {
        this.addMobileAIConfig();
    }

    /**
     * 销毁移动端 AI 按钮
     */
    public destroy(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        document.getElementById('menuAI')?.remove();

        const mobileSeparators = document.querySelectorAll('.b3-menu__separator[data-whisper-separator]');
        mobileSeparators.forEach(separator => {
            separator.remove();
        });
    }

    /**
     * 添加移动端 AI 按钮
     */
    private addMobileAIConfig(): void {
        const mobileMenu = document.getElementById('menu');
        if (!mobileMenu) {
            logging.error('mobileMenu element does not exist.');
            return;
        }

        // 监听 mobileMenu 元素，直到 menuRiffCard 元素存在
        this.observer = new MutationObserver((_mutationsList, observer) => {
            const mobileRiffCardMenu = document.getElementById('menuRiffCard');
            if (mobileRiffCardMenu) {
                // 找到 menuRiffCard 元素后，停止监听
                observer?.disconnect();

                const mobileAiMenu = document.getElementById('menuAI');
                if (!mobileAiMenu) {
                    const aiHTML = `<div class="b3-menu__item${window.siyuan.config?.readonly ? ' fn__none' : ''}" id="menuAI">
                        <svg class="b3-menu__icon"><use xlink:href="#iconSparkles"></use></svg><span class="b3-menu__label">AI</span>
                    </div>`;
                    // 插入 AI 选项
                    mobileRiffCardMenu.insertAdjacentHTML('afterend', aiHTML);
                }
            }
        });

        // 开始监听 mobileMenu 的子元素变化
        this.observer.observe(mobileMenu, { childList: true, subtree: true });

        // 设置超时时间，一分钟后停止监听并报错
        setTimeout(() => {
            this.observer?.disconnect();
            this.observer = null;

            const mobileRiffCardMenu = document.getElementById('menuRiffCard');
            if (!mobileRiffCardMenu) {
                logging.error('menuRiffCard element does not exist.');
            }
        }, 60000); // 1 分钟超时
    }
}