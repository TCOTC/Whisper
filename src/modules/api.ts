type ApiRes<T = null> = { code: number; msg: string; data: T };

async function post<T = null>(url: string, body: object): Promise<ApiRes<T>> {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return await res.json();
    } catch (e) {
        return { code: 500, msg: e instanceof Error ? e.message : String(e), data: null as T };
    }
}

export const getLocalStorageVal = (key: string) =>
    post<unknown>('/api/storage/getLocalStorageVal', { key });

export const setLocalStorageVal = (key: string, val: unknown) =>
    post<unknown>('/api/storage/setLocalStorageVal', { key, val });

export const removeLocalStorageVal = (key: string) =>
    post('/api/storage/removeLocalStorageVal', { key });

export async function getFile(path: string): Promise<string | ApiRes> {
    try {
        const res = await fetch('/api/file/getFile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
        });
        return res.status === 200 ? res.text() : res.json();
    } catch (e) {
        return { code: 500, msg: e instanceof Error ? e.message : String(e), data: null };
    }
}

export const removeFile = (path: string) => post('/api/file/removeFile', { path });
