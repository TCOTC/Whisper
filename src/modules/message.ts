import { pushErrMsg, pushMsg } from './api';

/**
 * 显示消息（通过内核接口推送，由思源前端统一渲染）
 * @param message 消息内容
 * @param timeout 消息显示时间，单位：毫秒。0：手动关闭；-1：永不关闭
 * @param type 消息类型，info：普通消息，error：错误消息
 * @returns 消息 ID
 */
export async function showMessage(
    message: string,
    timeout = 6000,
    type: 'info' | 'error',
): Promise<string | undefined> {
    if (!message) {
        return;
    }

    const response = await (type === 'error' ? pushErrMsg(message, timeout) : pushMsg(message, timeout));
    if (response.code !== 0) {
        return;
    }

    return response.data?.id;
}
