import express from 'express';
import cors from 'cors';
import fs from 'fs';
import {
    enhanceData, getCachedItemInfo, getItemInfoByIndex,
    getKeyForPageFull,
    insertImagesToPage, isAlreadyProcessed,
    isAlreadyUploaded, setCachedItemInfo,
    startParser
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
const extractorOffset = Number(process.env.WIKI_EXTRACTOR_OFFSET ?? 0);
const extractorLimit = Number(process.env.WIKI_EXTRACTOR_LIMIT ? process.env.WIKI_EXTRACTOR_LIMIT: -1);
const concurrency = Number(process.env.WIKI_EXTRACTOR_CONCURRENCY ?? 5);

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

if (extractorOffset === undefined || isNaN(extractorOffset)) {
    throw new Error('WIKI_EXTRACTOR_OFFSET is not set');
}

if (extractorLimit === undefined || isNaN(extractorLimit)) {
    throw new Error('WIKI_EXTRACTOR_LIMIT is not set');
}

console.log('WIKI_DOWNLOADER_OUTPUT_DIR', outputDir);
console.log('WIKI_SWARM_PREFIX', keyPrefix);
console.log('WIKI_ZIMDUMP_CUSTOM', zimdumpCustom);
console.log('WIKI_UPLOADER_REDIS', redisUrl);
console.log('WIKI_UPLOADER_URL', uploaderUrl);
console.log('WIKI_ENHANCER_URL', enhancerUrl);
console.log('WIKI_EXTRACTOR_CONCURRENCY', concurrency);
console.log('WIKI_EXTRACTOR_OFFSET', extractorOffset);
console.log('WIKI_EXTRACTOR_LIMIT', extractorLimit);

const client = createClient({
    url: redisUrl
});
client.on('error', (err) => {
    console.log('Redis Client Error', err)
});

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
    await startParser(extractorOffset, extractorLimit, keyPrefix, zimdumpCustom, filePath,
        async (item, data, keyLocalIndex) => {
            const key = getKeyForPageFull(keyPrefix, lang, item)
            let content = ''

            if (data) {
                // if data exists it means that this is the page, and we should process it
                content = await insertImagesToPage(zimdumpCustom, data, filePath)
            } else {
                // it is redirect. handle it
                // try to get cached info by zim index
                let info = await getCachedItemInfo(client, filename, item.redirect_index)
                if (!info) {
                    // if cached info is not found, get an info from zim file
                    info = await getItemInfoByIndex(zimdumpCustom, filePath, item.redirect_index)
                    // and save to cache. because hundreds of redirects can refer to the same page
                    await setCachedItemInfo(client, filename, item.redirect_index, JSON.stringify(info))
                }

                content = `redirect:${info.key}`
            }

            try {
                await enhanceData(enhancerUrl, key, keyLocalIndex, content, JSON.stringify({
                    ...item,
                    filename
                }))
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
                console.log('already exists in cache, skip', lang, item.key)
                return false
            } else {
                console.log('content is not uploaded, allow to upload', lang, item.key)
                return true
            }
        },
        (i, count, title) => {
            console.log(`processing item ${i + 1}/${count} - ${title}`)
        },
        {
            concurrency
        })

    console.log('Done!')
});

client.connect().then(async () => {
    try {
        await client.configSet('save', '5 1');
    } catch (e) {
        console.log(e)
    }
})

export default app;