import { ThemeModule } from '../types';
import { isMobile, isMac, isWindows } from './utils';

export class DeviceDetector implements ThemeModule {
    /**
     * 添加设备类型标识到 body 元素，用于 CSS 选择器
     */
    public init(): void {
        if (isMobile()) {
            document.body.dataset.whisperDevice = 'mobile';
        } else if (isMac()) {
            document.body.dataset.whisperDevice = 'mac';
        } else if (isWindows()) {
            document.body.dataset.whisperDevice = 'windows';
        }
    }

    public destroy(): void {
        // 移除设备类型标识
        document.body.removeAttribute('data-whisper-device');
    }
} 