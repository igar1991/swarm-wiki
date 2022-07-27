import util from 'node:util';
import {exec as exec0} from 'node:child_process';
import fetch, {File, FormData} from "node-fetch";
import {parse} from "node-html-parser";
import Queue from "queue-promise";
import {extractFilename} from "../utils/utils.js";

export const MIDDLE_PREFIX_PAGE = 'page_'
export const MIDDLE_PREFIX_PAGE_INDEX = 'page_index_'

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
    if (!url) {
        throw new Error('url is no defined')
    }

    return url
        .split('\\').join('\\\\')
        .split('"').join('\\\"')
        .split('$').join('\\\$')
        .split('`').join('\\\`')
}

/**
 * Extracts a file from zim archive by url like "I/myfile.webp"
 */
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
        // todo decodeURIComponent?
        const src = decodeURI(img.attributes.src)
            .split('../')
            .join('')
        let imgContent = cache[src]

        try {
            const data = await extractFileByUrl(zimdumpCustom, src, zimPath)
            imgContent = data.toString('base64')
        } catch (e) {
            console.log('error on file extraction, fill with empty data', e)
            imgContent = ''
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
        throw new Error(stderr)
    }

    return stdout
}

/**
 * Sends data to the enhancement server
 */
export async function enhanceData(enhancerUrl, key, keyLocalIndex, content, meta) {
    if (!enhancerUrl) {
        throw new Error('enhancerUrl is not defined')
    }

    if (!key) {
        throw new Error('key is not defined')
    }

    if (!keyLocalIndex) {
        throw new Error('keyLocalIndex is not defined')
    }

    if (!content) {
        throw new Error('content is not defined')
    }

    if (!meta) {
        throw new Error('meta is not defined')
    }

    const form = new FormData();
    form.append('key', key);
    form.append('keyLocalIndex', keyLocalIndex);
    form.append('meta', meta);
    const file = new File([content], 'file.html', {type: 'text/html'})
    form.append('file', file);

    return (await fetch(enhancerUrl + 'enhance-page', {
        method: 'POST',
        body: form
    })).json()
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

export async function getTitlesList(zimdumpCustom, filePath, offset, limit) {
    const {stdout, stderr} = await exec(`${zimdumpCustom} list --ns A ${filePath}`, execConfigText);

    if (stderr) {
        throw new Error('stderr error ' + stderr);
    }

    if (limit === -1) {
        limit = 100_000_000
    }

    return stdout
        .split('\n')
        .slice(offset, offset + limit)
        .map(item => item.substring(2))
        .reverse()
}

export async function getItemsCount(zimdumpCustom, filePath) {
    const {stdout, stderr} = await exec(`${zimdumpCustom} info ${filePath}`, execConfigText);

    if (stderr) {
        throw new Error('stderr error', stderr);
    }

    // get first line and return second part of the line "count: 12312"
    return Number(stdout.split("\n")[0].split(":")[1])
}

/**
 * Gets cached info about page by ZIM index. Useful for converting redirect indexes to real pages (if information about them are stored under cache)
 */
export async function getCachedItemInfo(client, filename, index) {
    const key = getCachedItemKey(filename, index)
    let storedInfo = await client.get(key)

    return storedInfo ? JSON.parse(storedInfo) : null
}

/**
 * Saves info about ZIM index to cache
 */
export function setCachedItemInfo(client, filename, index, value) {
    const key = getCachedItemKey(filename, index)
    return client.set(key, value)
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
    if (!zimdumpCustom) {
        throw new Error('zimdumpCustom is not defined')
    }

    if (!filePath) {
        throw new Error('filePath is not defined')
    }

    if (!url) {
        throw new Error('url is not defined')
    }

    url = prepareUrl(url)
    const {
        stdout,
        stderr
    } = await exec(`${zimdumpCustom} list --details --url "${url}" ${filePath}`, execConfigText);

    if (stderr) {
        throw new Error(stderr);
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
export async function startParser(extractorOffset, extractorLimit, keyPrefix, zimdumpCustom, zimPath, onItem, onIsGetPage, onIsGetPageFull, onCounter, options) {
    const zimFilename = extractFilename(zimPath)
    if (!onItem) {
        throw new Error('onItem is required')
    }

    if (!onIsGetPage) {
        throw new Error('onIsGetPage is required')
    }

    if (!onIsGetPageFull) {
        throw new Error('onIsGetPageFull is required')
    }

    const queue = new Queue({
        concurrent: options?.concurrency || 5
    });

    const titles = await getTitlesList(zimdumpCustom, zimPath, extractorOffset, extractorLimit)
    console.log('Total titles:', titles.length)
    const titlesCount = titles.length

    async function task(i, title, count, offset) {
        if (onCounter) {
            onCounter(i - offset, count, title)
        }

        if (!title) {
            console.log('title is empty, skip')
            return
        }

        if (!await onIsGetPage(i, zimFilename)) {
            return
        }

        try {
            const keyLocal = getKeyLocalIndex(keyPrefix, zimFilename, i)
            console.log('onIsGetPage', 'i', i, 'title', title, 'keyLocal', keyLocal)
            const itemInfo = await getItemInfoByUrl(zimdumpCustom, zimPath, title)
            if (!await onIsGetPageFull(itemInfo)) {
                return
            }

            if (itemInfo.type === 'page') {
                const data = await extractPage(zimdumpCustom, itemInfo.index, zimPath)
                await onItem(itemInfo, data, keyLocal, i)
            } else if (itemInfo.type === 'redirect') {
                await onItem(itemInfo, null, keyLocal, i)
            }
        } catch (e) {
            console.log('task error', e)
        }
    }

    // delayed adding tasks to queue is necessary for millions of tasks
    // because Queue is not support so big queues
    return new Promise((resolve) => {
        const offset = extractorOffset || 0
        const firstBatch = Math.max(options.concurrency, 100)
        let counter = 0

        for (let i = offset; i <= firstBatch + offset; i++) {
            const title = titles.pop()
            if (!title) {
                break
            }

            queue.enqueue(() => task(i, title, titlesCount, offset))
        }

        queue.on('resolve', () => {
            // 1000 + 0 + 2000000
            const nextI = firstBatch + counter + offset
            // 2001000 >= 2000000 + 2000000
            if (nextI >= titlesCount + offset) {
                return
            }

            const title = titles.pop()
            queue.enqueue(() => task(nextI, title, titlesCount, offset))
            counter++
        });

        queue.on('reject', error => console.error(error));

        queue.on('end', async () => {
            console.log('tasks ended')
            resolve()
        });
    })
}

/**
 * Checks if page is already processed and information about it stored in DB
 */
export async function isAlreadyProcessed(client, keyPrefix, filename, index) {
    const key = getKeyLocalIndex(keyPrefix, filename, index)
    let storedInfo = await client.get(key)
    storedInfo = storedInfo ? JSON.parse(storedInfo) : {}
    // console.log('db local key info', key, storedInfo)

    return !!storedInfo.meta
}

/**
 * Checks if page is already uploaded and information about it stored in DB
 */
export async function isAlreadyUploaded(client, keyPrefix, lang, item) {
    const key = getKeyForPageFull(keyPrefix, lang, item)
    let storedInfo = await client.get(key)
    storedInfo = storedInfo ? JSON.parse(storedInfo) : {}

    return storedInfo.topic && storedInfo.uploadedData && storedInfo.uploadedData.reference && storedInfo.updated_at
}

/**
 * Generates key for storing a page.
 * Example: wiki_page_en_Hello
 */
export function getKeyForPageFull(keyPrefix, lang, item) {
    return keyPrefix + MIDDLE_PREFIX_PAGE + lang.toLowerCase() + '_' + item.key
}

/**
 * Generates key for storing a page just by ZIM index from titles list.
 * Example: wiki_page_index_wikipedia_en_100_maxi_2022-06.zim_12
 */
export function getKeyLocalIndex(keyPrefix, filename, index) {
    return keyPrefix + MIDDLE_PREFIX_PAGE_INDEX + filename.toLowerCase() + '_' + index
}

/**
 * Name for caching pages by ZIM index
 * Example: cache_wikipedia_en_100_maxi_2022-06.zim_235
 */
export function getCachedItemKey(filename, index) {
    return `cache_${filename}_${index}`
}

