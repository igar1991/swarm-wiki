import fs from 'fs/promises';
import {parse} from "node-html-parser";
import Queue from "queue-promise";
import fetch, {File, FormData} from "node-fetch";

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getList(path) {
    const list = await fs.readFile(path, 'utf8');

    return list
        .split('\n')
}

export async function processContent(options) {
    const {zimContentDirectory, articles, lang, uploaderUrl, exceptions} = options;

    const concurrency = options?.concurrency || 5
    const queue = new Queue({
        concurrent: concurrency
    });
    queue.on('reject', error => console.error(error));

    // todo process exceptions files
    for (const [index, rawKey] of articles.entries()) {
        // if (index > 50000) break;

        console.log(`article ${index + 1} of ${articles.length}`);
        const key = rawKey.trim()
        if (!key) {
            console.log('empty key');
            continue
        }

        const filePath = `${zimContentDirectory}A/${key}`
        const saveKey = `wiki_page_${lang.toLowerCase()}_${key}`
        const cacheFileName = `${zimContentDirectory}cache/${key}`

        try {
            const stat = await fs.stat(cacheFileName)
            if (stat.isFile()) {
                console.log('cache file exists, skip', cacheFileName);
                continue
            }
        } catch (e) {

        }

        let fileInfo
        try {
            fileInfo = await fs.stat(filePath)
            if (!fileInfo.isFile()) {
                console.log('not a file', filePath);
                continue
            }
        } catch (e) {
            console.log('file does not exist', filePath);
            continue
        }

        queue.enqueue(async () => {
            const page = await fs.readFile(filePath, {encoding: 'utf8'});
            const parsed = parse(page)

            try {
                const redirectUrl = getRedirectUrl(parsed)
                await uploadContent(uploaderUrl, saveKey, cacheFileName, `redirect:${redirectUrl}`)

                return
            } catch (e) {

            }

            const preparedPage = await insertImagesToPage(parsed, zimContentDirectory)
            await uploadContent(uploaderUrl, saveKey, cacheFileName, preparedPage)
        })

        while (queue.size >= concurrency) {
            // todo move to config
            await sleep(300)
        }
    }
}

// export function prepareUrl(url) {
//     if (!url) {
//         throw new Error('url is no defined')
//     }
//
//     return url
//         .split('\\').join('\\\\')
//         .split('"').join('\\\"')
//         .split('$').join('\\\$')
//         .split('`').join('\\\`')
// }

export async function getImageByName(path, name) {
    const filePath = `${path}/I/${name}`
    const fileInfo = await fs.stat(filePath)
    if (!fileInfo.isFile()) {
        throw new Error(`image file does not exist ${filePath}`)
    }

    return fs.readFile(filePath)
}

export async function insertImagesToPage(parsed, path) {
    const imgs = parsed.querySelectorAll('img')
    const cache = {}
    for (const img of imgs) {
        // sometimes its more than one "../"
        const src = decodeURIComponent(img.attributes.src)
            .split('../')
            .join('')
        let imgContent = cache[src] ?? ''

        try {
            const data = await getImageByName(path, src)
            imgContent = data.toString('base64')
        } catch (e) {
            // console.log('error on file extraction, fill with empty data', e)
        }

        cache[src] = imgContent
        let type = 'webp'
        if (src.endsWith('.png')) {
            type = 'png'
        } else if (src.endsWith('.jpg') || src.endsWith('.jpeg')) {
            type = 'jpeg'
        } else if (src.endsWith('.gif')) {
            type = 'gif'
        } else if (src.endsWith('.svg')) {
            type = 'svg+xml'
        }

        img.setAttribute('src', `data:image/${type};base64,` + imgContent)
    }

    return parsed.innerHTML
}

export function getRedirectUrl(parsed) {
    const meta = parsed.querySelector('meta[http-equiv="refresh"]')
    if (meta) {
        const content = meta.attributes.content
        if (content) {
            let decoded = decodeURIComponent(content.slice(6))
            if (decoded.startsWith('../')) {
                decoded = decoded.slice(3)
            }

            return decoded
        } else {
            throw new Error('redirect content is not defined')
        }
    } else {
        throw new Error('redirect meta is not defined')
    }
}

/**
 * Sends page to Bee node
 */
export async function uploadContent(uploaderUrl, key, cacheFileName, content) {
    const form = new FormData();
    form.append('key', key);
    form.append('cacheFileName', cacheFileName);

    const file = new File([content], 'file.html', {type: 'text/html'})
    form.append('file', file);

    return (await fetch(uploaderUrl + 'upload-v2', {
        method: 'POST',
        body: form
    })).json()
}
