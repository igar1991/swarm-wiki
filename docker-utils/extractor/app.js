import util from 'node:util';
import {exec as exec0} from 'node:child_process';
import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
const exec = util.promisify(exec0);
const MIDDLE_PREFIX_PAGE = 'page_'

const enhancerUrl = process.env.WIKI_ENHANCER_URL;
const outputDir = process.env.WIKI_DOWNLOADER_OUTPUT_DIR;
const keyPrefix = process.env.WIKI_SWARM_PREFIX;
const zimdumpCustom = process.env.WIKI_ZIMDUMP_CUSTOM ?? 'zimdump';

if (!enhancerUrl) {
    throw new Error('WIKI_ENHANCER_URL is not set');
}

if (!outputDir) {
    throw new Error('WIKI_DOWNLOADER_OUTPUT_DIR is not set');
}

if (!keyPrefix) {
    throw new Error('WIKI_SWARM_PREFIX is not set');
}

console.log('WIKI_ENHANCER_URL', enhancerUrl);
console.log('WIKI_DOWNLOADER_OUTPUT_DIR', outputDir);

const error = (res, text) => {
    return res.status(500).json({result: 'error', text});
}

app.use(cors());
app.use(express.json());
app.post('/extract', async (req, res, next) => {
    const {fileName, limit} = req.body;

    if (!fileName) {
        return error(res, `File param is empty`);
    }

    const filePath = outputDir + fileName
    console.log('Received fileName', fileName, 'filePath', filePath);

    if (!fs.existsSync(filePath)) {
        const message = `File ${filePath} not found`
        console.log(message)
        return error(res, message);
    }

    res.send({result: 'ok'});
    const {stdout, stderr} = await exec(`${zimdumpCustom} list --details ${filePath}`, {
        maxBuffer: 1024 * 1024 * 500,
    });

    if (stderr) {
        console.error('ERROR', stderr);
        return
    }

    const zims = parseList(stdout)
    const withContent = zims.filter(item => item.type === 'page').filter(item => item.internal_type !== 'redirect');

    console.log('Zims count', zims.length, 'withContent count', withContent.length);

    let counter = 0;
    for (const item of withContent) {
        const {stdout, stderr} = await exec(`${zimdumpCustom} show --idx ${item.index} ${filePath}`);
        if (stderr) {
            console.error('ERROR', stderr);
            continue
        }

        const fullKey = keyPrefix + MIDDLE_PREFIX_PAGE + item.key
        console.log('KEY', fullKey);
        try {
            await fetch(enhancerUrl + 'enhance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: fullKey,
                    page: stdout
                })
            })
        } catch (e) {
            console.log('ERROR enhance', e.message);
        }

        counter++;
        if (limit && counter >= limit) {
            break;
        }
    }
});

export default app;