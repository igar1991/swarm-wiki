import fetch from 'node-fetch';
import {sleep} from '../utils/utils.js';

const beeUrl = process.env.WIKI_BEE_URL;
const triggerUrl = process.env.WIKI_TRIGGER_URL;

if (!triggerUrl) {
    throw new Error('WIKI_TRIGGER_URL is not set');
}

if (!beeUrl) {
    throw new Error('WIKI_BEE_URL is not set');
}

(async function () {
    while (true) {
        try {
            const json = await (await fetch(`${beeUrl}feeds/fffffA46f2883920e6f4976CF2F2E905523d80E6/00fbf04e4619b79da2e2ca5f4dae35cf00d622bce6fbe755f577baf500e7bd11?type=sequence`)).json();
            console.log(json)
            await fetch(triggerUrl + 'run', {
                method: 'POST',
            });
            return
        } catch (e) {
            console.log(e)
        }

        console.log('Bee waiter: node is not ready')

        // todo move to config?
        await sleep(3000);
    }
})()