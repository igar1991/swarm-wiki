import {detectIssues, prepareBatchesArray, resolveIssue, sleep} from './utils.js';
import {BeeDebug} from '@ethersphere/bee-js';

let ttlLimit = process.env.WIKI_TOPUPER_TTL_LIMIT;
let targetBatches = process.env.WIKI_TOPUPER_TARGET_BATCHES ?? '';
let beeDebugUrl = process.env.WIKI_BEE_DEBUG_URL;
let amount = process.env.WIKI_TOPUPER_AMOUNT;
let sleepSeconds = process.env.WIKI_TOPUPER_SLEEP_SECONDS;

if (!ttlLimit) {
    throw new Error('WIKI_TOPUPER_TTL_LIMIT is not set');
}

if (!beeDebugUrl) {
    throw new Error('WIKI_BEE_DEBUG_URL is not set');
}

if (!amount) {
    throw new Error('WIKI_TOPUPER_AMOUNT is not set');
}

if (!sleepSeconds) {
    throw new Error('WIKI_TOPUPER_SLEEP_SECONDS is not set');
}

console.log('WIKI_TOPUPER_TTL_LIMIT', ttlLimit);
console.log('WIKI_TOPUPER_TARGET_BATCHES', targetBatches);
console.log('WIKI_BEE_DEBUG_URL', beeDebugUrl);
console.log('WIKI_TOPUPER_AMOUNT', amount);
console.log('WIKI_TOPUPER_SLEEP_SECONDS', sleepSeconds);

(async function () {
    const beeDebug = new BeeDebug(beeDebugUrl);
    targetBatches = prepareBatchesArray(targetBatches)
    while (true) {
        try {
            const issues = await detectIssues(beeDebug, {
                targetBatches,
                ttlLimit
            })

            console.log('issues found', issues.length)

            for (const issue of issues) {
                console.log('resolving issue', issue);
                try {
                    await resolveIssue(beeDebug, issue, {
                        amount
                    })
                    console.log('issue resolved!')
                } catch (e) {
                    console.log('error with resolving issue', e.message);
                }
            }
        } catch (e) {
            console.log('error with detecting issues', e.message);
        }

        await sleep(sleepSeconds * 1000);
    }
})()