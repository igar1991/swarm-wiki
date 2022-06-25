import util from 'node:util';
import {exec as exec0} from 'node:child_process';
import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import {parseList} from './utils.js';
import {getUnixTimestamp, sleep} from '../utils/utils.js';
import {createClient} from 'redis';

const app = express();
const exec = util.promisify(exec0);
const MIDDLE_PREFIX_PAGE = 'page_'

const enhancerUrl = process.env.WIKI_ENHANCER_URL;
const outputDir = process.env.WIKI_DOWNLOADER_OUTPUT_DIR;
const keyPrefix = process.env.WIKI_SWARM_PREFIX;
const zimdumpCustom = process.env.WIKI_ZIMDUMP_CUSTOM ?? 'zimdump';
const redisUrl = process.env.WIKI_UPLOADER_REDIS;
const uploaderUrl = process.env.WIKI_UPLOADER_URL;

if (!enhancerUrl) {
    throw new Error('WIKI_ENHANCER_URL is not set');
}

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

console.log('WIKI_ENHANCER_URL', enhancerUrl);
console.log('WIKI_DOWNLOADER_OUTPUT_DIR', outputDir);
console.log('WIKI_SWARM_PREFIX', keyPrefix);
console.log('WIKI_ZIMDUMP_CUSTOM', zimdumpCustom);
console.log('WIKI_UPLOADER_REDIS', redisUrl);
console.log('WIKI_UPLOADER_URL', uploaderUrl);

const client = createClient({
    url: redisUrl
});
client.on('error', (err) => {
    // console.log('Redis Client Error', err)
});

const error = (res, text) => {
    return res.status(500).json({result: 'error', text});
}

/**
 * Gets uploader status
 *
 * @returns {Promise<string>}
 */
async function getUploaderStatus() {
    return (await (await fetch(uploaderUrl + 'status')).json()).status
}

let status = 'ok'
app.use(cors());
app.use(express.json());
app.post('/extract', async (req, res, next) => {
    const {fileName, lang, limit} = req.body;

    if (!fileName) {
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
    const withContent = zims.filter(item => item.type === 'page').filter(item => item.internal_type !== 'redirect');

    console.log('Zims count', zims.length, 'withContent count', withContent.length);

    for (const [i, item] of withContent.entries()) {
        if (limit && i >= limit) {
            break;
        }

        console.log(`Page ${i}/${withContent.length}`)
        const key = keyPrefix + MIDDLE_PREFIX_PAGE + lang.toLowerCase() + '_' + item.key
        console.log('Key', key);
        let storedInfo = await client.get(key)
        storedInfo = storedInfo ? JSON.parse(storedInfo) : {}
        console.log('storedInfo', storedInfo)

        // todo remove this temp lifehack for setting time
        if (storedInfo.uploadedData && storedInfo.uploadedData.reference && !storedInfo.updated_at) {
            await client.set(key, JSON.stringify({
                ...storedInfo,
                updated_at: getUnixTimestamp()
            }))

            console.log('Reference found, but date is not set, date updated')
            continue
        }

        if (storedInfo.updated_at) {
            console.log('Reference and update time found, skip')
            continue
        }

        while (true) {
            let uploaderStatus = ''
            try {
                uploaderStatus = await getUploaderStatus()
                if (uploaderStatus === 'ok') {
                    break
                }
            } catch (e) {

            }

            console.log('uploader status is not ok -', uploaderStatus, '- sleep')
            // todo move to config
            await sleep(5000)
        }


        const {stdout, stderr} = await exec(`${zimdumpCustom} show --idx ${item.index} ${filePath}`, {
            maxBuffer: 1024 * 1024 * 500,
        });
        if (stderr) {
            console.error('stderr show error', stderr);
            continue
        }

        console.log('Page size', stdout.length);

        try {
            const response = await (await fetch(enhancerUrl + 'enhance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key,
                    page: stdout
                })
            })).json()
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