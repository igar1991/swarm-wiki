import {Bee, BeeDebug} from '@ethersphere/bee-js';
import bmt from "@fairdatasociety/bmt-js";
import {getUnixTimestamp, sleep} from "../utils/utils.js";

/**
 * Calculates used stamp percentage
 * 100 - is fully used, 0 - is not used at all
 */
export function used(stamp) {
    const {depth, bucketDepth, utilization} = stamp

    return (utilization / Math.pow(2, depth - bucketDepth)) * 100
}

/**
 * Gets active batch for data uploading
 *
 * @returns {Promise<string>}
 */
export async function getActiveBatch(beeDebugUrl) {
    const beeDebug = new BeeDebug(beeDebugUrl)
    const allBatch = (await beeDebug.getAllPostageBatch()).map(item => ({...item, used: used(item)}))
    if (allBatch.length === 0) {
        throw new Error('No batches found')
    }

    const usableBatch = allBatch
        .filter(batch => batch.used < 100 && batch.usable)
        .sort((a, b) => b.used - a.used)
    if (usableBatch.length === 0) {
        throw new Error('No usable batch found')
    }

    return usableBatch[0].batchID
}

/**
 * Calculates data reference without uploading data to bee
 */
export async function getDataReference(data) {
    const chunkedFile = bmt.makeChunkedFile(data)
    const tree = chunkedFile.bmt()

    return bmt.Utils.bytesToHex(tree[tree.length - 1][0].address(), 64)
}

/**
 * Uploads data to feed
 */
export async function uploadData(beeUrl, beeDebugUrl, privateKey, key, data) {
    const batchId = await getActiveBatch(beeDebugUrl)
    const bee = new Bee(beeUrl)
    const topic = bee.makeFeedTopic(key)
    const feedWriter = bee.makeFeedWriter('sequence', topic, privateKey)
    // todo write in docs about pined data and reuploading possibility with bee js lib methods and about using bmt-js
    let reference = null
    try {
        const uploadedData = await bee.uploadData(batchId, data, {
            pin: true
        })
        reference = uploadedData.reference
    } catch (e) {
        if (e.message?.includes('Conflict: chunk already exists')) {
            reference = await getDataReference(data)
        }
    }

    const feedReference = await feedWriter.upload(batchId, reference, {
        pin: true
    })

    return {
        topic,
        feedReference,
        uploadedData: {reference}
    }
}

export async function uploadAction(client, data, onSetStatus, onGetStatus, config){
    const {beeUrl, beeDebugUrl, privateKey, key, keyLocalIndex, type, meta} = config
    if (!onSetStatus){
        throw new Error('onSetStatus is not set')
    }

    if (!onGetStatus){
        throw new Error('onGetStatus is not set')
    }

    while (true) {
        console.log('uploading...', key, keyLocalIndex)
        try {
            let uploadedData = null
            if (type === 'page') {
                uploadedData = await uploadData(beeUrl, beeDebugUrl, privateKey, key, data)
            } else if (type === 'file') {
                uploadedData = await uploadData(beeUrl, beeDebugUrl, privateKey, key, data)
            }

            if (uploadedData) {
                console.log('uploaded data result', key, keyLocalIndex, uploadedData)
                await client.set(key, JSON.stringify({
                    ...uploadedData,
                    meta: JSON.parse(meta),
                    updated_at: getUnixTimestamp()
                }))

                await client.set(keyLocalIndex, JSON.stringify({
                    meta: JSON.parse(meta),
                    updated_at: getUnixTimestamp()
                }))
                onSetStatus('ok')
            } else {
                console.log('empty uploaded data, skip saving, status = "uploading_error"', key, keyLocalIndex)
                onSetStatus('uploading_error')
            }
        } catch (e) {
            const message = e.message ?? ''
            console.log('Uploading error', message)
            if (message.startsWith('Payment Required: batch is overissued')) {
                onSetStatus('overissued')
            } else if (message.includes('Not Found')) {
                onSetStatus('not_found')
            }
        }

        const status = onGetStatus()
        if (status === 'ok') {
            break
        }

        console.log('status is not ok', status, key, keyLocalIndex)
        // todo move time to config
        await sleep(5000)
    }
}
