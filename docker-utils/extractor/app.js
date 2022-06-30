import express from 'express';
import cors from 'cors';
import fs from 'fs';
import {
    enhanceData, extractPage, getCachedItemInfo, getItemInfoByIndex,
    getKeyForPageFull,
    getKeyLocalIndex,
    insertImagesToPage, isAlreadyProcessed,
    isAlreadyUploaded, setCachedItemInfo,
    startParser,
    waitUploader
} from './utils.js';
import {createClient} from 'redis';
import {extractFilename} from "../utils/utils.js";

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

    const filename = extractFilename(filePath)
    await startParser(keyPrefix, zimdumpCustom, filePath,
        async (item, data, keyLocalIndex, localIndex) => {
            const key = getKeyForPageFull(keyPrefix, lang, item)
            let content = ''

            if (data) {
                content = await insertImagesToPage(zimdumpCustom, data, filePath)
                await waitUploader(uploaderUrl)
            } else {
                let info = await getCachedItemInfo(client, filename, item.redirect_index)
                if (info) {
                } else {
                    info = await getItemInfoByIndex(zimdumpCustom, filePath, item.redirect_index)
                    await setCachedItemInfo(client, filename, item.redirect_index, JSON.stringify(info))
                }

                content = `redirect:${info.key}`
            }

            try {
                const response = await enhanceData(enhancerUrl, key, keyLocalIndex, content, JSON.stringify({
                    ...item,
                    filename
                }))
                status = response.status
            } catch (e) {
                console.log('error', e.message);
            }

        },
        async (i, filename) => {
            if (await isAlreadyProcessed(client, keyPrefix, filename, i)) {
                console.log('already processed, skip', filename, i)
                return false
            }

            return true
        },
        async item => {
            if (await isAlreadyUploaded(client, keyPrefix, lang, item)) {
                console.log('already uploaded, skip', lang, item.key)
                return false
            }

            return true
        },
        (i, count, title) => {
            console.log(`processing item ${i + 1}/${count} - ${title}`)
        })

    console.log('Done!')
});

client.connect().then(async () => {
    await client.configSet('save', '5 1');
})

export default app;