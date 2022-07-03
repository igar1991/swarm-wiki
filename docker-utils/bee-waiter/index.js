import fetch from 'node-fetch';
import {sleep} from '../utils/utils.js';

const beeDebugUrl = process.env.WIKI_BEE_DEBUG_URL;
const triggerUrl = process.env.WIKI_TRIGGER_URL;

if (!beeDebugUrl) {
    throw new Error('WIKI_BEE_DEBUG_URL is not set');
}

if (!triggerUrl) {
    throw new Error('WIKI_TRIGGER_URL is not set');
}

(async function () {
    while (true) {
        try {
            const json = await (await fetch(`${beeDebugUrl}readiness`)).json();
            console.log(json)
            if (json.status === 'ok') {
                await fetch(triggerUrl + 'run', {
                    method: 'POST',
                });
                return
            }
        } catch (e) {
            console.log(e)
        }

        console.log('Bee waiter: node is not ready')

        // todo move to config?
        await sleep(3000);
    }
})()