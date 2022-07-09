/**
 * Sleeps for a given time
 */

import fetch from "node-fetch";

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets unix timestamp
 */
export function getUnixTimestamp() {
    return Math.round(Date.now() / 1000)
}

// todo remove
export const error = (res, text) => {
    return res.status(500).json({result: 'error', text});
}

export const extractFilename = (filePath) => filePath.split('/').pop()

/**
 * Gets uploader status
 */
export async function getUploaderStatus(uploaderUrl) {
    return (await (await fetch(uploaderUrl + 'status')).json()).status
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
