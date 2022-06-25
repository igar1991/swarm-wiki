/**
 * @typedef IssueObject
 * @type {Object}
 * @property {string} issueType
 * @property {string} batchID
 */

/**
 * Detects issues with batches
 *
 * @returns {Promise<IssueObject[]>}
 */
export async function detectIssues(beeDebug, options) {
    const {targetBatches, ttlLimit} = options;

    const allBatches = await beeDebug.getAllPostageBatch()
    const filteredBatches = targetBatches ? allBatches.filter(item => targetBatches.includes(item.batchID)) : allBatches
    if (filteredBatches.length === 0) {
        return []
    }

    const issues = []
    for (const batch of filteredBatches) {
        if (Number(batch.batchTTL) <= Number(ttlLimit)) {
            batch.issueType = 'ttl'
            issues.push(batch)
        }
    }

    return issues
}

/**
 * Resolves issues with a batch
 */
export async function resolveIssue(beeDebug, issue, options) {
    if (issue.issueType === 'ttl') {
        await beeDebug.topUpBatch(issue.batchID, options.amount)
    } else {
        throw new Error('Unknown issue type')
    }
}

/**
 * Parses batches array from string
 */
export function prepareBatchesArray(targetBatches) {
    return targetBatches.split(',').map(item => item.trim()).filter(item => !!item.trim());
}
