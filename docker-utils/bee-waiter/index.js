import fetch from 'node-fetch';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const beeDebugUrl = process.env.WIKI_BEE_DEBUG;
const triggerUrl = process.env.WIKI_TRIGGER_URL;

if (!beeDebugUrl) {
    throw new Error('WIKI_BEE_DEBUG is not set');
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

        await delay(3000);
    }
})()