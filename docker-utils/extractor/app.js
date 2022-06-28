import express from 'express';
import cors from 'cors';
import fs from 'fs';
import {enhanceData, getKeyForPage, insertImagesToPage, isAlreadyUploaded, startParser, waitUploader} from './utils.js';
import {createClient} from 'redis';

const app = express();

const outputDir = process.env.WIKI_DOWNLOADER_OUTPUT_DIR;
const keyPrefix = process.env.WIKI_SWARM_PREFIX;
const zimdumpCustom = process.env.WIKI_ZIMDUMP_CUSTOM ?? 'zimdump';
const redisUrl = process.env.WIKI_UPLOADER_REDIS;
const uploaderUrl = process.env.WIKI_UPLOADER_URL;
const enhancerUrl = process.env.WIKI_ENHANCER_URL;

if (!outputDir) {
    throw new Error('WIKI_DOWNLOADER_OUTPUT_DIR is not set');
}

if (!keyPrefix) {
    throw new Error('WIKI_SWARM_PREFIX is not set');
}

if (!redisUrl) {
    throw new Error('WIKI_UPLOADER_REDIS is not set')
}

if (!uploaderUrl) {
    throw new Error('WIKI_UPLOADER_URL is not set')
}

if (!enhancerUrl) {
    throw new Error('WIKI_ENHANCER_URL is not set');
}

console.log('WIKI_DOWNLOADER_OUTPUT_DIR', outputDir);
console.log('WIKI_SWARM_PREFIX', keyPrefix);
console.log('WIKI_ZIMDUMP_CUSTOM', zimdumpCustom);
console.log('WIKI_UPLOADER_REDIS', redisUrl);
console.log('WIKI_UPLOADER_URL', uploaderUrl);
console.log('WIKI_ENHANCER_URL', enhancerUrl);

const client = createClient({
    url: redisUrl
});
client.on('error', (err) => {
    console.log('Redis Client Error', err)
});

let status = 'ok'
app.use(cors());
app.use(express.json());
app.post('/extract', async (req, res, next) => {
    const {fileName, lang, limit} = req.body;

    if (!fileName) {
        return next(`File param is empty`);
    }

    if (!lang) {
        return next(`Lang is empty`);
    }

    if (limit) {
        console.log(`limit is ${limit}`);
    }

    const filePath = outputDir + fileName
    console.log('received fileName', fileName, 'filePath', filePath);

    if (!fs.existsSync(filePath)) {
        const message = `File ${filePath} not found`
        console.log(message)
        return next(message);
    }

    res.send({result: 'ok'});

    await startParser(zimdumpCustom, filePath,
        async (item, data) => {
            const key = getKeyForPage(keyPrefix, lang, item)

            if (data) {
                const pageWithImages = await insertImagesToPage(zimdumpCustom, data, filePath)
                await waitUploader(uploaderUrl)

                try {
                    const response = await enhanceData(enhancerUrl, key, pageWithImages, JSON.stringify({
                        ...item,
                        filename: filePath
                    }), 'page')
                    status = response.status
                } catch (e) {
                    console.log('error', e.message);
                }
            } else {
                console.log('REDIRECT received. SKIP')
                // todo it is redirect, also check for cache before processing
                // todo implement
            }
        },
        async item => {
            const key = getKeyForPage(keyPrefix, lang, item)
            let storedInfo = await client.get(key)
            storedInfo = storedInfo ? JSON.parse(storedInfo) : {}
            console.log('storedInfo', storedInfo)

            if (isAlreadyUploaded(storedInfo)) {
                console.log('already uploaded, skip')
                return false
            }

            return true
        },
        (i, count) => {
            console.log(`Processing item ${i + 1}/${count}`)
        })

    console.log('Done!')
});

client.connect().then(async () => {
    await client.configSet('save', '5 1');
})

export default app;