import util from 'node:util';
import {exec as exec0} from 'node:child_process';
import fetch, {FormData, File} from "node-fetch";
import {parse} from "node-html-parser";
import Queue from "queue-promise";
import {sleep} from "../utils/utils.js";

export const MIDDLE_PREFIX_PAGE = 'page_'

const exec = util.promisify(exec0);
const execConfigText = {
    maxBuffer: 1024 * 1024 * 1500,
}

const execConfigBinary = {
    maxBuffer: 1024 * 1024 * 1500,
    encoding: 'binary',
}

/**
 * @typedef ListObject
 * @type {Object}
 * @property {string} key
 * @property {string} path
 * @property {string} type
 * @property {string} index
 * @property {string} redirect_index
 * @property {string} internal_type
 * @property {string} mime_type
 * @property {string} item_size
 * @property {string} title
 */

/**
 * Parse zim list output
 *
 * @returns {Array.<ListObject>}
 */
export function parseList(data) {
    const result = []
    const lines = data.split('\n');

    let currentItem = {}
    for (let line of lines) {
        line = line.trim()
        let splitParts = line.split(':')[0]
        splitParts = line.split(splitParts + ':')
        if (splitParts.length !== 2) {
            continue
        }

        const path = splitParts[1].trim()
        if (line.startsWith('path:')) {
            if (currentItem.type && currentItem.type !== 'unknown') {
                result.push(currentItem)
            }

            let type = 'unknown'
            if (path.startsWith('-/')) {
                type = 'file'
            } else if (path.startsWith('A/')) {
                type = 'page'
            } else if (path.startsWith('I/')) {
                type = 'image'
            } else if (path.startsWith('M/')) {
                type = 'meta'
            } else if (path.startsWith('X/')) {
                type = 'index'
            }

            const key = (['page', 'image'].includes(type)) ? path.substring(2) : path
            currentItem = {
                key,
                path,
                type
            }
        } else if (line.startsWith('title:')) {
            currentItem.title = path
        } else if (line.startsWith('idx:')) {
            currentItem.index = path
        } else if (line.startsWith('redirect index:')) {
            currentItem.type = 'redirect'
            currentItem.redirect_index = path
        } else if (line.startsWith('type:')) {
            currentItem.internal_type = path
        } else if (line.startsWith('mime-type:')) {
            currentItem.mime_type = path
        } else if (line.startsWith('item size:')) {
            currentItem.item_size = path
        }
    }

    if (currentItem.type !== 'unknown') {
        result.push(currentItem)
    }

    return result
}

export async function extractFileById(zimdumpCustom, fileIndex, filePath) {
    const {stdout, stderr} = await exec(`${zimdumpCustom} show --idx ${fileIndex} ${filePath}`, execConfigBinary);
    if (stderr) {
        // todo throw error and catch it
        console.error('stderr show error', stderr);
    }

    return Buffer.from(stdout, 'binary')
}

export function prepareUrl(url) {
    return url.split('"').join('\\\"')
}

export async function extractFileByUrl(zimdumpCustom, url, filePath) {
    url = prepareUrl(url)
    const command = `${zimdumpCustom} show --url "${url}" ${filePath}`
    const {stdout, stderr} = await exec(command, execConfigBinary);
    if (stderr) {
        // todo throw error and catch it
        console.error('stderr show error', stderr);
    }

    return Buffer.from(stdout, 'binary')
}

export async function insertImagesToPage(zimdumpCustom, page, zimPath) {
    const parsed = parse(page)
    const imgs = parsed.querySelectorAll('img')
    const cache = {}
    for (const img of imgs) {
        // sometimes its more than one "../"
        const src = decodeURI(img.attributes.src)
            .split('../')
            .join('')
        // console.log(cache[src] ? 'TRUE CACHE' : 'false cache', 'src', src)
        const imgContent = cache[src] ?? (await extractFileByUrl(zimdumpCustom, src, zimPath)).toString('base64')
        if (!imgContent.length) {
            throw new Error('Image is empty ' + src)
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

export async function extractPage(zimdumpCustom, fileIndex, filePath) {
    const {stdout, stderr} = await exec(`${zimdumpCustom} show --idx ${fileIndex} ${filePath}`, execConfigText);
    if (stderr) {
        // todo throw error and catch it
        console.error('stderr show error', stderr);
    }

    return stdout
}

/**
 * Sends data to the enhancement server
 */
export async function enhanceData(enhancerUrl, key, content, meta, type) {
    const form = new FormData();
    form.append('key', key);
    form.append('meta', meta);
    let action = ''
    // todo remove file support. all images will be embedded to the html
    if (type === 'file') {
        action = 'enhance-file'
        const file = new File([content], 'file.bin', {type: 'application/octet-stream'})
        form.append('file', file);
    } else if (type === 'page') {
        action = 'enhance-page'
        const file = new File([content], 'file.html', {type: 'text/html'})
        form.append('file', file);
    } else {
        throw new Error(`Unknown type: ${type}`)
    }

    return (await fetch(enhancerUrl + action, {
        method: 'POST',
        body: form
    })).json()
}

/**
 * Gets uploader status
 *
 * @returns {Promise<string>}
 */
export async function getUploaderStatus(uploaderUrl) {
    return (await (await fetch(uploaderUrl + 'status')).json()).status
}

export async function getPages(zimdumpCustom, filePath) {
    const {stdout, stderr} = await exec(`${zimdumpCustom} list --details ${filePath}`, execConfigText);

    if (stderr) {
        throw new Error('stderr error', stderr);
    }

    const zims = parseList(stdout)
    const pages = zims
        .filter(item => ['page'].includes(item.type))
        .filter(item => item.internal_type !== 'redirect');

    return {zims, pages}
}

export async function getTitlesList(zimdumpCustom, filePath) {
    const {stdout, stderr} = await exec(`${zimdumpCustom} list --ns A ${filePath}`, execConfigText);

    if (stderr) {
        throw new Error('stderr error', stderr);
    }

    return stdout.split('\n').map(item => item.substring(2))
}

export async function getItemsCount(zimdumpCustom, filePath) {
    const {stdout, stderr} = await exec(`${zimdumpCustom} info ${filePath}`, execConfigText);

    if (stderr) {
        throw new Error('stderr error', stderr);
    }

    // get first line and return second part of the line "count: 12312"
    return Number(stdout.split("\n")[0].split(":")[1])
}

export async function getItemInfoByIndex(zimdumpCustom, filePath, itemIndex) {
    const {
        stdout,
        stderr
    } = await exec(`${zimdumpCustom} list --details --idx ${itemIndex} ${filePath}`, execConfigText);

    if (stderr) {
        throw new Error('stderr error', stderr);
    }

    const parsed = parseList(stdout)
    if (parsed.length === 0) {
        throw new Error('Item not found')
    }

    return parsed[0]
}

export async function getItemInfoByUrl(zimdumpCustom, filePath, url) {
    url = prepareUrl(url)
    const {
        stdout,
        stderr
    } = await exec(`${zimdumpCustom} list --details --url "${url}" ${filePath}`, execConfigText);

    if (stderr) {
        throw new Error('stderr error', stderr);
    }

    const parsed = parseList(stdout)
    if (parsed.length === 0) {
        throw new Error('Item not found')
    }

    return parsed[0]
}

/**
 * Reads ZIM items one by one, check if them is not already uploaded and callback with filled pages
 */
export async function startParser(zimdumpCustom, zimPath, onItem, onIsGetPage, onCounter) {
    if (!onItem) {
        throw new Error('onItem is required')
    }

    if (!onIsGetPage) {
        throw new Error('onIsGetPage is required')
    }

    const queue = new Queue({
        concurrent: 10
    });

    const count = await getItemsCount(zimdumpCustom, zimPath)
    const titles = await getTitlesList(zimdumpCustom, zimPath)
    const redirects = []

    async function task(i, count) {
        if (onCounter) {
            await onCounter(i, count)
        }

        const itemInfo = await getItemInfoByUrl(zimdumpCustom, zimPath, titles[i])
        if (itemInfo.type === 'page') {
            try {
                if (await onIsGetPage(itemInfo)) {
                    const data = await extractPage(zimdumpCustom, itemInfo.index, zimPath)
                    await onItem(itemInfo, data)
                }
            } catch (e) {
                console.log('error on item processing', e)
            }
        } else if (itemInfo.type === 'redirect') {
            redirects.push(itemInfo)
        }
    }

    // delayed adding tasks to queue is necessary for millions of tasks
    // because Queue is not support so big queues
    return new Promise((resolve) => {
        const firstBatch = 100
        let counter = 0
        for (let i = 0; i < count; i++) {
            if (i >= firstBatch) {
                break
            }

            queue.enqueue(() => task(i, count))
        }

        queue.on('resolve', () => {
            const nextI = firstBatch + counter
            if (nextI >= count) {
                console.log('END!!!')
                return
            }

            queue.enqueue(() => task(nextI, count))
            counter++
        });

        queue.on('end', async () => {
            for (const redirect of redirects) {
                await onItem(redirect)
            }

            resolve()
        });
    })
}

/**
 * Wait while uploader will be ready for files (in case stamps updates, disk errors etc.)
 */
export async function waitUploader(uploaderUrl) {
    while (true) {
        let uploaderStatus = ''
        try {
            uploaderStatus = await getUploaderStatus(uploaderUrl)
            if (uploaderStatus === 'ok') {
                break
            }
        } catch (e) {

        }

        console.log('uploader status is not ok -', uploaderStatus, '- sleep')
        // todo move to config
        await sleep(5000)
    }
}

/**
 * Checks if page is already uploaded and information about it stored in DB
 */
export function isAlreadyUploaded(storedInfo) {
    return storedInfo.topic && storedInfo.uploadedData && storedInfo.uploadedData.reference && storedInfo.updated_at
}

/**
 * Generates key for storing a page. Output example: wiki_page_en_Hello
 */
export function getKeyForPage(keyPrefix, lang, item){
    return keyPrefix + MIDDLE_PREFIX_PAGE + lang.toLowerCase() + '_' + item.key
}
