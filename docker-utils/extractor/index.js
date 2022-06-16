import util from 'node:util';
import {exec as exec0} from 'node:child_process';
import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';

const app = express();
const exec = util.promisify(exec0);

const uploaderUrl = process.env.WIKI_UPLOADER_URL;
const port = process.env.WIKI_EXTRACTOR_PORT;
const outputDir = process.env.WIKI_DOWNLOADER_OUTPUT_DIR;

if (!uploaderUrl) {
    throw new Error('WIKI_UPLOADER_URL is not set');
}

if (!port) {
    throw new Error('WIKI_EXTRACTOR_PORT is not set');
}

if (!outputDir) {
    throw new Error('WIKI_DOWNLOADER_OUTPUT_DIR is not set');
}

console.log('WIKI_EXTRACTOR_PORT', port);
console.log('WIKI_UPLOADER_URL', uploaderUrl);
console.log('WIKI_DOWNLOADER_OUTPUT_DIR', outputDir);

function parseList(data) {
    const result = []
    const lines = data.split('\n');

    let currentItem = {}
    for (let line of lines) {
        line = line.trim()
        let splitParts = line.split(':')[0]
        splitParts = line.split(splitParts + ':')
        if (splitParts.length !== 2) {
            continue
        }

        const path = splitParts[1].trim()
        if (line.startsWith('path:')) {
            if (currentItem.type !== 'unknown') {
                result.push(currentItem)
            }

            const type = path.startsWith('-/') ? 'file' : (path.startsWith('A/') ? 'page' : 'unknown')
            currentItem = {
                path,
                type
            }
        } else if (line.startsWith('title:')) {
            currentItem.title = path
        } else if (line.startsWith('idx:')) {
            currentItem.index = path
        } else if (line.startsWith('redirect index:')) {
            currentItem.redirect_index = path
        } else if (line.startsWith('type:')) {
            currentItem.internal_type = path
        } else if (line.startsWith('mime-type:')) {
            currentItem.mime_type = path
        } else if (line.startsWith('item size:')) {
            currentItem.item_size = path
        }
    }

    if (currentItem.type !== 'unknown') {
        result.push(currentItem)
    }

    return result
}

app.use(cors());
app.use(express.json());
app.post('/extract', async (req, res) => {
    const {fileName} = req.body;
    const filePath = outputDir + fileName
    console.log('Received fileName', fileName, 'filePath', filePath);

    const {stdout, stderr} = await exec(`zimdump list --details ${filePath}`);
    if (stderr) {
        console.error('ERROR', stderr);
        return
    }

    const zims = parseList(stdout)
    const withContent = zims.filter(item => item.type === 'page').filter(item => item.internal_type !== 'redirect');

    for (const item of withContent) {
        const {stdout, stderr} = await exec(`zimdump show --idx ${item.index} ${filePath}`);
        if (stderr) {
            console.error('ERROR', stderr);
            continue
        }

        await fetch(uploaderUrl + 'upload-page', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // todo concat key from env
            body: JSON.stringify({
                key: item.title,
                page: stdout
            })
        })

        // todo remove this blocker for one page
        return
    }

    // todo upload other files and redirects

    res.send({result: 'ok'});
});

app.listen(port, () => console.log(`Started extractor server at http://localhost:${port}`));
