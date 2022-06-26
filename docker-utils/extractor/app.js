import util from 'node:util';
import {exec as exec0} from 'node:child_process';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import {enhanceData, extractFile, extractPage, getUploaderStatus, parseList} from './utils.js';
import {error, getUnixTimestamp, sleep} from '../utils/utils.js';
import {createClient} from 'redis';

const app = express();
const exec = util.promisify(exec0);
const MIDDLE_PREFIX_PAGE = 'page_'
const MIDDLE_PREFIX_IMAGE = 'image_'

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
    // console.log('Redis Client Error', err)
});

let status = 'ok'
app.use(cors());
app.use(express.json());
app.post('/extract', async (req, res, next) => {
    const {fileName, lang, limit} = req.body;

    if (!fileName) {
        // todo use next?
        return error(res, `File param is empty`);
    }

    if (!lang) {
        return error(res, `Lang is empty`);
    }

    if (limit) {
        console.log(`Limit is ${limit}`);
    }

    const filePath = outputDir + fileName
    console.log('received fileName', fileName, 'filePath', filePath);

    if (!fs.existsSync(filePath)) {
        const message = `File ${filePath} not found`
        console.log(message)
        return error(res, message);
    }

    res.send({result: 'ok'});
    // todo move config to const, reuse
    const {stdout, stderr} = await exec(`${zimdumpCustom} list --details ${filePath}`, {
        maxBuffer: 1024 * 1024 * 500,
    });

    if (stderr) {
        console.error('stderr list error', stderr);
        return
    }

    const zims = parseList(stdout)
    const content = zims
        .filter(item => ['image', 'page'].includes(item.type))
        .filter(item => item.internal_type !== 'redirect');

    console.log('ZIM items count', zims.length, 'content count', content.length);

    for (const [i, item] of content.entries()) {
        if (limit && i >= limit) {
            break;
        }

        console.log(`item ${i + 1}/${content.length}`)
        let key = ''
        if (item.type === 'image') {
            key = keyPrefix + MIDDLE_PREFIX_IMAGE + lang.toLowerCase() + '_' + item.key
        } else if (item.type === 'page') {
            key = keyPrefix + MIDDLE_PREFIX_PAGE + lang.toLowerCase() + '_' + item.key
        }

        if (!key) {
            const message = `Unknown type of item: ${item.type}`
            console.log(message)
            return error(res, message);
        }

        console.log('key', key);
        let storedInfo = await client.get(key)
        storedInfo = storedInfo ? JSON.parse(storedInfo) : {}
        console.log('storedInfo', storedInfo)

        // todo remove this temp lifehack for setting time
        // if (storedInfo.uploadedData && storedInfo.uploadedData.reference && !storedInfo.updated_at) {
        //     await client.set(key, JSON.stringify({
        //         ...storedInfo,
        //         updated_at: getUnixTimestamp()
        //     }))
        //
        //     console.log('Reference found, but date is not set, date updated')
        //     continue
        // }

        if (storedInfo.topic && storedInfo.uploadedData && storedInfo.uploadedData.reference && storedInfo.updated_at) {
            console.log('Topic and update time found, skip')
            continue
        }

        while (true) {
            let uploaderStatus = ''
            try {
                uploaderStatus = await getUploaderStatus(uploaderUrl)
                if (uploaderStatus === 'ok') {
                    break
                }
            } catch (e) {

            }

            console.log('uploader status is not ok -', uploaderStatus, '- sleep')
            // todo move to config
            await sleep(5000)
        }

        let stdout = ''
        if (item.type === 'image') {
            stdout = await extractFile(zimdumpCustom, item.index, filePath)
        } else if (item.type === 'page') {
            stdout = await extractPage(zimdumpCustom, item.index, filePath)
        }

        if (!stdout.length) {
            const message = `Content of zim item is empty, index: ${item.index}`
            console.log(message)
            return error(res, message);
        }

        console.log('content size', stdout.length);

        try {
            const response = await enhanceData(enhancerUrl, key, stdout, item.type === 'page' ? 'page' : 'file')
            status = response.status
        } catch (e) {
            console.log('error', e.message);
        }
    }
});

client.connect().then(async () => {
    await client.configSet('save', '5 1');
})

export default app;