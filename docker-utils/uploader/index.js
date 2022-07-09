import express from 'express';
import cors from 'cors';
import {Wallet} from 'ethers';
import {Bee} from '@ethersphere/bee-js';
import {createClient} from 'redis';
import {uploadData} from './utils.js';
import {getUnixTimestamp, sleep} from "../utils/utils.js";
import multer from "multer";

const upload = multer({
    storage: multer.memoryStorage(),
    fieldSize: 1024 * 1024 * 500
})
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

// ok, overissued, uploading_error, not_found
let status = 'ok'

app.use(cors());
app.use(express.json({limit: 1024 * 1024 * 20}));
app.get('/status', async (req, res) => {
    res.send({result: 'ok', status});
});

app.post('/upload', upload.single('file'), async (req, res, next) => {
    const {key, keyLocalIndex, page, meta} = req.body;
    const file = req.file?.buffer

    if (!key) {
        return next('Key is empty')
    }

    if (!keyLocalIndex) {
        return next('KeyLocalIndex is empty')
    }

    if (!meta) {
        return next('Meta is empty')
    }

    if (!(file || page)) {
        return next('File or page is empty')
    }

    let type = 'unknown'
    if (page) {
        type = 'page'
    } else if (file) {
        type = 'file'
    }

    if (type === 'unknown') {
        return next('type is not correct')
    }

    console.log('/upload', key, 'type', type);
    res.send({result: 'ok', status});

    while (true) {
        console.log('uploading...', key, keyLocalIndex)
        try {
            let uploadedData = null
            if (type === 'page') {
                uploadedData = await uploadData(beeUrl, beeDebugUrl, privateKey, key, page)
            } else if (type === 'file') {
                uploadedData = await uploadData(beeUrl, beeDebugUrl, privateKey, key, file)
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
                status = 'ok'
            } else {
                console.log('empty uploaded data, skip saving, status = "uploading_error"', key, keyLocalIndex)
                status = 'uploading_error'
            }
        } catch (e) {
            const message = e.message ?? ''
            console.log('Uploading error', message)
            if (message.startsWith('Payment Required: batch is overissued')) {
                status = 'overissued'
            } else if (message.includes('Not Found')) {
                status = 'not_found'
            }
        }

        if (status === 'ok') {
            break
        }

        console.log('status is not ok', status, key, keyLocalIndex)
        // todo move time to config
        await sleep(5000)
    }
});

client.connect().then(async () => {
    try {
        await client.configSet('save', '5 1');
    } catch (e) {

    }
})
app.listen(port, () => console.log(`Started uploader server at http://localhost:${port}`));