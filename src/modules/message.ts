import { genUUID } from './utils';

/**
 * 显示消息，思源原生函数
 * @param message 消息内容
 * @param timeout 消息显示时间，单位：毫秒。0：手动关闭；-1：永不关闭
 * @param type 消息类型，info：普通消息，error：错误消息
 * @param messageId 消息ID，如果未提供，则自动生成
 * @returns 
 */
export const showMessage = (message: string, timeout = 6000, type = 'info', messageId?: string) => {
    let messagesElement = document.getElementById('message') as HTMLElement | null;
    if (!messagesElement) return;
    messagesElement = messagesElement.firstElementChild as HTMLElement | null;
    if (!messagesElement) {
        document.body.insertAdjacentHTML('beforeend', `<div style="top: 10px;
    position: fixed;
    z-index: 100;
    background: white;
    padding: 10px;
    border-radius: 5px;
    right: 10px;
    border: 1px solid #e0e0e0;" id='tempMessage'>${message}</div>`);
        return;
    }
    const id = messageId || genUUID();
    const existElement = messagesElement.querySelector(`.b3-snackbar[data-id="${id}"]`);
    const messageVersion = message + (type === 'error' ? ' v' + (window.siyuan?.version ?? '') : '');
    if (existElement) {
        const timeoutId = existElement.getAttribute('data-timeoutid');
        if (timeoutId) {
            window.clearTimeout(parseInt(timeoutId));
        }
        existElement.innerHTML = `<div data-type="textMenu" class="b3-snackbar__content${timeout === 0 ? ' b3-snackbar__content--close' : ''}">${messageVersion}</div>${timeout === 0 ? '<svg class="b3-snackbar__close"><use xlink:href="#iconCloseRound"></use></svg>' : ''}`;
        if (type === 'error') {
            existElement.classList.add('b3-snackbar--error');
        } else {
            existElement.classList.remove('b3-snackbar--error');
        }
        if (timeout > 0) {
            const timeoutId = window.setTimeout(() => {
                hideMessage(id);
            }, timeout);
            existElement.setAttribute('data-timeoutid', timeoutId.toString());
        }
        return;
    }
    let messageHTML = `<div data-id="${id}" class="b3-snackbar--hide b3-snackbar${type === 'error' ? ' b3-snackbar--error' : ''}"><div data-type="textMenu" class="b3-snackbar__content${timeout === 0 ? ' b3-snackbar__content--close' : ''}">${messageVersion}</div>`;
    if (timeout === 0) {
        messageHTML += '<svg class="b3-snackbar__close"><use xlink:href="#iconCloseRound"></use></svg>';
    } else if (timeout !== -1) { // -1 时需等待请求完成后手动关闭
        const timeoutId = window.setTimeout(() => {
            hideMessage(id);
        }, timeout);
        messageHTML = messageHTML.replace('<div data-id', `<div data-timeoutid="${timeoutId}" data-id`);
    }
    if (messagesElement.parentElement) {
        messagesElement.parentElement.classList.add('b3-snackbars--show');
        messagesElement.parentElement.style.zIndex = ((window.siyuan?.zIndex ?? 0) + 1).toString();
    }
    messagesElement.insertAdjacentHTML('afterbegin', messageHTML + '</div>');
    setTimeout(() => {
        messagesElement.querySelectorAll('.b3-snackbar--hide').forEach(item => {
            item.classList.remove('b3-snackbar--hide');
        });
    });
    
    // 检查并移除重复的消息
    const firstChild = messagesElement.firstElementChild;
    if (firstChild && firstChild.nextElementSibling && 
        firstChild.nextElementSibling.innerHTML === firstChild.innerHTML) {
        firstChild.nextElementSibling.remove();
    }
    
    messagesElement.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    return id;
};

/**
 * 隐藏消息，思源原生函数
 * @param id 消息ID
 */
export const hideMessage = (id?: string) => {
    let messagesElement = document.getElementById('message') as HTMLElement | null;
    if (!messagesElement) return;
    messagesElement = messagesElement.firstElementChild as HTMLElement | null;
    if (!messagesElement) return;
    if (id) {
        const messageElement = messagesElement.querySelector(`[data-id="${id}"]`);
        if (messageElement) {
            messageElement.classList.add('b3-snackbar--hide');
            const timeoutId = messageElement.getAttribute('data-timeoutid');
            if (timeoutId) {
                window.clearTimeout(parseInt(timeoutId));
            }
            setTimeout(() => {
                messageElement.remove();
                if (messagesElement.childElementCount === 0 && messagesElement.parentElement) {
                    messagesElement.parentElement.classList.remove('b3-snackbars--show');
                    messagesElement.innerHTML = '';
                }
            }, 256);
        }
        let hasShowItem = false;
        Array.from(messagesElement.children).find(item => {
            if (!item.classList.contains('b3-snackbar--hide')) {
                hasShowItem = true;
                return true;
            }
        });
        if (hasShowItem && messagesElement.parentElement) {
            messagesElement.parentElement.classList.add('b3-snackbars--show');
        } else if (messagesElement.parentElement) {
            messagesElement.parentElement.classList.remove('b3-snackbars--show');
        }
    } else {
        if (messagesElement.parentElement) {
            messagesElement.parentElement.classList.remove('b3-snackbars--show');
            setTimeout(() => {
                messagesElement.innerHTML = '';
            }, 256);
        }
    }
};