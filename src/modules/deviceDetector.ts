import { ThemeModule } from '../types';
import { isMobile, isMac, isWindows } from './utils';

export class DeviceDetector implements ThemeModule {
    /**
     * 初始化设备检测并添加设备类型标识
     */
    public init(): void {
        this.addDeviceTypeAttribute();
    }

    /**
     * 销毁设备检测
     */
    public destroy(): void {
        // 移除设备类型标识
        document.body.removeAttribute("data-whisper-device");
    }

    /**
     * 添加设备类型标识到 body 元素
     */
    private addDeviceTypeAttribute(): void {
        if (isMobile()) {
            document.body.dataset.whisperDevice = "mobile";
        } else if (isMac()) {
            document.body.dataset.whisperDevice = "mac";
        } else if (isWindows()) {
            document.body.dataset.whisperDevice = "windows";
        }
    }
} 