import express from 'express';
import cors from 'cors';
import {Wallet} from 'ethers';
import {Bee} from '@ethersphere/bee-js';
import {createClient} from 'redis';
import {uploadData} from './utils.js';
import {getUnixTimestamp, sleep} from "../utils/utils.js";
import multer from "multer";

const upload = multer({storage: multer.memoryStorage()})
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

const client = createClient({
    url: redisUrl
});
client.on('error', (err) => {
    // console.log('Redis Client Error', err)
});

// todo move to utils or remove
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

app.post('/upload', upload.single('file'), async (req, res, next) => {
    const {key, page} = req.body;

    if (!key) {
        return next('key is not set')
    }

    let type = 'unknown'
    if (page) {
        type = 'page'
    } else if (req.file) {
        type = 'file'
    }

    if (type === 'unknown') {
        return next('type is not correct')
    }

    console.log('/upload', key, 'type', type);
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
                if (type === 'page') {
                    data = await uploadData(beeUrl, beeDebugUrl, privateKey, key, page)
                } else if (type === 'file') {
                    data = await uploadData(beeUrl, beeDebugUrl, privateKey, key, req.file.buffer)
                }
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

        // todo move time to config
        await sleep(5000)
    }
});

client.connect().then(async () => {
    await client.configSet('save', '5 1');
})
app.listen(port, () => console.log(`Started uploader server at http://localhost:${port}`));