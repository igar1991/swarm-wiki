import fs from 'fs/promises';
import {parse} from "node-html-parser";
import Queue from "queue-promise";
import fetch, {File, FormData} from "node-fetch";
import {Bee} from "@ethersphere/bee-js";
import {Wallet} from "ethers";

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function isCorrectMode(mode) {
    return ['common', 'restore'].includes(mode);
}

/**
 * Extracts correct key for uploading from exception item
 */
export function extractKeyFromExceptionItem(exceptionItem) {
    if (exceptionItem === 'A%2f100%_Lena') {
        return '100%_Lena'
    }

    if (exceptionItem === 'A%2f%%2f%') {
        return '/'
    }

    let result = decodeURIComponent(exceptionItem)
    if (result.startsWith('A/')) {
        result = result.substring(2)
    }

    return result
}

/**
 * Gets list of items from file
 *
 * @param path
 * @returns {Promise<string[]>}
 */
export async function getList(path) {
    const list = await fs.readFile(path, 'utf8');

    return list
        .split('\n')
}

export async function checkContentExists(ownerAddress, beeUrl, key) {
    const bee = new Bee(beeUrl)
    const topic = bee.makeFeedTopic(key)
    const feedReader = bee.makeFeedReader('sequence', topic, ownerAddress)
    const content = await feedReader.download()
    const data = (await bee.downloadData(content.reference)).text()
    if (!data) {
        throw new Error(`Data under ${content.reference} is empty`)
    }
}

export async function isFileExists(path) {
    try {
        const stat = await fs.stat(path)

        return stat.isFile()
    } catch (e) {
        return false
    }
}

/**
 * Processes all content
 */
export async function processContent(options) {
    const {
        zimContentDirectory,
        articles,
        lang,
        uploaderUrl,
        exceptions,
        mode,
        privateKey,
        beeUrl,
        resolverDirectory
    } = options;

    if (!resolverDirectory && !(await fs.stat(resolverDirectory)).isDirectory()) {
        throw new Error(`Resolver directory ${resolverDirectory} does not exist`)
    }

    let ownerAddress = privateKey ? (new Wallet(privateKey)).address : null;

    if (!isCorrectMode(mode)) {
        throw new Error('Mode is not correct');
    }

    if (mode === 'restore' && !(privateKey && beeUrl && ownerAddress)) {
        throw new Error('Private key or bee url or owner address is not set for mode "restore"');
    }

    const concurrency = options?.concurrency || 5
    const queue = new Queue({
        concurrent: concurrency
    });
    queue.on('reject', error => console.error(error));

    const exceptionLength = exceptions.length
    const totalLength = articles.length + exceptionLength
    for (const [index, rawKey] of [...exceptions, ...articles].entries()) {
        if (['X%2ffulltext%2fxapian', 'X%2ftitle%2fxapian'].includes(rawKey)) {
            console.log('skip xapian index')
            continue
        }

        const rawKeyTrimmed = rawKey.trim()
        const isException = index < exceptionLength
        console.log(`item ${index + 1} (${isException ? 'exception' : 'article'}) of ${totalLength}`);
        const key = isException ? extractKeyFromExceptionItem(rawKeyTrimmed) : rawKeyTrimmed
        if (!key) {
            console.log('empty key');
            continue
        }

        const pageFilePath = isException ? `${zimContentDirectory}_exceptions/${rawKeyTrimmed}` : `${zimContentDirectory}A/${key}`
        const saveKey = `wiki_page_${lang.toLowerCase()}_${key}`
        const cacheFileName = `${zimContentDirectory}cache/${rawKeyTrimmed}`

        try {
            const stat = await fs.stat(cacheFileName)
            if (stat.isFile()) {
                if (mode !== 'restore') {
                    console.log('cache file exists, skip', cacheFileName);
                    // const topic = JSON.parse(await fs.readFile(cacheFileName, 'utf8')).topic
                    // const resolveFilePath = `${resolverDirectory}${topic}`
                    // if (!await isFileExists(resolveFilePath)) {
                    //     console.log('resolve file not found, write...', resolveFilePath)
                    //     await fs.writeFile(resolveFilePath, rawKeyTrimmed)
                    // }

                    continue
                }
            }
        } catch (e) {
            console.log(`cache error: ${e.message}`)
        }

        let fileInfo
        try {
            fileInfo = await fs.stat(pageFilePath)
            if (!fileInfo.isFile()) {
                console.log('not a file', pageFilePath);
                continue
            }
        } catch (e) {
            console.log('file does not exist', pageFilePath);
            continue
        }

        queue.enqueue(async () => {
            if (mode === 'restore') {
                try {
                    console.log(`checking for restoring ${cacheFileName}`)
                    // const cacheContent = JSON.parse(await fs.readFile(cacheFileName, 'utf8'))
                    await checkContentExists(ownerAddress, beeUrl, saveKey)
                    console.log(`references found for ${cacheFileName}`)

                    return
                } catch (e) {
                    console.log('restoring...', cacheFileName)
                }
            }

            const page = await fs.readFile(pageFilePath, {encoding: 'utf8'});
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

/**
 * Gets image content from filesystem
 *
 * @returns {Promise<Buffer>}
 */
export async function getImageByName(path, name) {
    const filePath = `${path}${name}`
    const fileInfo = await fs.stat(filePath)
    if (!fileInfo.isFile()) {
        throw new Error(`image file does not exist ${filePath}`)
    }

    return fs.readFile(filePath)
}

/**
 * Insert images to page as base64
 *
 * @returns {Promise<*>}
 */
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
