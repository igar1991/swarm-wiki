import fetch, {FormData, File} from 'node-fetch';

/**
 * Sends file or page to Bee node
 */
export async function uploadContent(uploaderUrl, key, content, meta, type) {
    const form = new FormData();
    form.append('key', key);
    form.append('meta', meta);
    if (type === 'page') {
        // form.append('page', content);
        const file = new File([content], 'file.html', { type: 'text/html' })
        form.append('file', file);
    } else if (type === 'file') {
        const file = new File([content], 'file.bin', { type: 'application/octet-stream' })
        form.append('file', file);
    } else {
        throw new Error('unknown type')
    }

    return (await fetch(uploaderUrl + 'upload', {
        method: 'POST',
        body: form
    })).json()
}