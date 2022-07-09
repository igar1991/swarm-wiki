import {Bee, BeeDebug} from '@ethersphere/bee-js';
import bmt from "@fairdatasociety/bmt-js";

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