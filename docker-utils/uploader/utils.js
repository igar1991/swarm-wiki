import {Bee, BeeDebug} from '@ethersphere/bee-js';

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
 * Uploads data to feed
 *
 * @returns {Promise<{uploadedData: UploadResult, feedReference: Reference)}>}
 */
export async function uploadData(beeUrl, beeDebugUrl, privateKey, key, data, reference) {
    const batchId = await getActiveBatch(beeDebugUrl)
    const bee = new Bee(beeUrl)
    const topic = bee.makeFeedTopic(key)
    const feedWriter = bee.makeFeedWriter('sequence', topic, privateKey)
    const uploadedData = await bee.uploadData(batchId, data)
    const feedReference = await feedWriter.upload(batchId, uploadedData.reference)

    return {
        feedReference,
        uploadedData
    }
}