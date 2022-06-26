import util from 'node:util';
import {exec as exec0} from 'node:child_process';
import fetch from "node-fetch";
import FormData from "form-data";

const exec = util.promisify(exec0);

/**
 * @typedef ListObject
 * @type {Object}
 * @property {string} key
 * @property {string} path
 * @property {string} type
 * @property {string} internal_type
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

export async function extractFile(zimdumpCustom, fileIndex, filePath) {
    const {stdout, stderr} = await exec(`${zimdumpCustom} show --idx ${fileIndex} ${filePath}`, {
        maxBuffer: 1024 * 1024 * 500,
        encoding: 'binary',
    });
    if (stderr) {
        // todo throw error and catch it
        console.error('stderr show error', stderr);
    }

    return Buffer.from(stdout, 'binary')
}

export async function extractPage(zimdumpCustom, fileIndex, filePath) {
    const {stdout, stderr} = await exec(`${zimdumpCustom} show --idx ${fileIndex} ${filePath}`, {
        maxBuffer: 1024 * 1024 * 500,
    });
    if (stderr) {
        // todo throw error and catch it
        console.error('stderr show error', stderr);
    }

    return stdout
}

export async function enhanceData(enhancerUrl, key, content, type) {
    const form = new FormData();
    form.append('key', key);
    let action = ''
    if (type === 'file') {
        action = 'enhance-file'
        form.append('file', content, {
            filename: 'file.bin',
            knownLength: content.length
        });
    } else if (type === 'page') {
        action = 'enhance-page'
        form.append('page', content);
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