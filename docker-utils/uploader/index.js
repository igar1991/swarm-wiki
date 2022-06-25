import express from 'express';
import cors from 'cors';
import {Wallet} from 'ethers';
import {Bee} from '@ethersphere/bee-js';
import {createClient} from 'redis';
import {uploadData} from './utils.js';
import {getUnixTimestamp} from "../utils/utils.js";

const app = express();

const port = process.env.WIKI_UPLOADER_PORT;
const privateKey = process.env.WIKI_UPLOADER_PRIVATE_KEY;
const beeUrl = process.env.WIKI_BEE_URL;
const beeDebugUrl = process.env.WIKI_BEE_DEBUG_URL;
const redisUrl = process.env.WIKI_UPLOADER_REDIS;

if (!port) {
    throw new Error('WIKI_UPLOADER_PORT is not set');
}

if (!privateKey) {
    throw new Error('WIKI_UPLOADER_PRIVATE_KEY is not set');
}

if (!beeUrl) {
    throw new Error('WIKI_BEE_URL is not set');
}

if (!beeDebugUrl) {
    throw new Error('WIKI_BEE_DEBUG_URL is not set')
}

if (!redisUrl) {
    throw new Error('WIKI_UPLOADER_REDIS is not set')
}

console.log('WIKI_UPLOADER_PORT', port);
console.log('WIKI_UPLOADER_PRIVATE_KEY length', privateKey.length);
console.log('WIKI_BEE_URL', beeUrl);
console.log('WIKI_BEE_DEBUG_URL', beeDebugUrl);
console.log('WIKI_UPLOADER_REDIS', redisUrl);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const client = createClient({
    url: redisUrl
});
client.on('error', (err) => {
    // console.log('Redis Client Error', err)
});

async function downloadFeedData(privateKey, key) {
    const wallet = new Wallet(privateKey)
    const bee = new Bee(beeUrl)
    const topic = bee.makeFeedTopic(key)
    const feedReader = bee.makeFeedReader('sequence', topic, wallet.address)
    return feedReader.download()
}

// ok, overissued
let status = 'ok'

app.use(cors());
app.use(express.json({limit: 1024 * 1024 * 20}));
app.get('/status', async (req, res) => {
    res.send({result: 'ok', status});
});
app.post('/upload-page', async (req, res) => {
    const {key, page} = req.body;
    console.log('/upload-page', key, 'page length', page.length);
    res.send({result: 'ok', status});
    if (status !== 'ok') {
        console.log('status', status, 'skip')
        return
    }

    while (true) {
        console.log('uploading...')
        try {
            let data = null
            try {
                data = await uploadData(beeUrl, beeDebugUrl, privateKey, key, page)
            } catch (e) {
                if (e.message.startsWith('Conflict: chunk already exists')) {
                    // todo handle it
                }
            }
            console.log('uploaded data result', data)
            if (!data) {
                console.log('empty uploaded data, skip saving')
            }

            await client.set(key, JSON.stringify({
                ...data,
                updated_at: getUnixTimestamp()
            }))
            status = 'ok'
        } catch (e) {
            if (e.message.startsWith('Payment Required: batch is overissued')) {
                status = 'overissued'
            }
        }

        if (status === 'ok') {
            break
        }

        // todo move to config
        await sleep(5000)
    }
});

// app.post('/upload-redirect', async (req, res) => {
//     const {key, reference} = req.body;
//     console.log('Received', 'key', key, 'reference', reference);
//     // todo implement
//     res.send({result: 'ok'});
// });
//
// app.post('/upload-file', async (req, res) => {
//     const {urls} = req.body;
//     console.log('Received', urls);
//     // todo implement
//     res.send({result: 'ok'});
// });

client.connect().then(async () => {
    await client.configSet('save', '5 1');
})
app.listen(port, () => console.log(`Started uploader server at http://localhost:${port}`));