import FormData from "form-data";
import fetch from 'node-fetch';

/**
 * Sends file or page to Bee node
 */
export async function uploadContent(uploaderUrl, key, content, type) {
    const form = new FormData();
    form.append('key', key);
    if (type === 'page') {
        form.append('page', content);
    } else if (type === 'file') {
        form.append('file', content,{
            filename: 'file.bin',
            knownLength: content.length
        });
    } else {
        throw new Error('unknown type')
    }

    return (await fetch(uploaderUrl + 'upload', {
        method: 'POST',
        body: form
    })).json()
}