import { ThemeModule } from '../types';
import { ThemeConfig } from './themeConfig';
import { showMessage } from './message';
import { isIPad, isMobile, isTouchDevice } from './utils';

const DEBUG_DELAY_MS = 5000;

/**
 * 调试信息：根据配置显示设备类型等调试消息
 */
export class DebugHandler implements ThemeModule {
    private scheduledTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly themeConfig = ThemeConfig.getInstance();
    private readonly onDebugShowMessageChange = (enabled: boolean): void => {
        if (enabled) {
            this.scheduleDebugInfo(0);
        } else {
            this.cancelScheduledDebugInfo();
        }
    };

    init(): void {
        this.themeConfig.onConfigChanged('debug_show_message', this.onDebugShowMessageChange);

        if (this.themeConfig.get('debug_show_message')) {
            this.scheduleDebugInfo(DEBUG_DELAY_MS);
        }
    }

    destroy(): void {
        this.themeConfig.offConfigChanged('debug_show_message', this.onDebugShowMessageChange);
        this.cancelScheduledDebugInfo();
    }

    private scheduleDebugInfo(delayMs: number): void {
        this.cancelScheduledDebugInfo();
        this.scheduledTimeout = setTimeout(() => {
            this.scheduledTimeout = null;
            this.showDebugInfo();
        }, delayMs);
    }

    private cancelScheduledDebugInfo(): void {
        if (this.scheduledTimeout) {
            clearTimeout(this.scheduledTimeout);
            this.scheduledTimeout = null;
        }
    }

    private showDebugInfo(): void {
        if (!this.themeConfig.get('debug_show_message')) {
            return;
        }

        if (isMobile()) this.message('isMobile');
        if (isIPad()) this.message('isIPad');
        if (isTouchDevice()) this.message('isTouchDevice');
    }

    private message(text: string): void {
        showMessage(text, 10000, 'info');
    }
}
