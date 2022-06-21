import express from 'express';
import cors from 'cors';
import fs from 'fs';
import fetch from 'node-fetch';
import {DownloaderHelper} from "node-downloader-helper";

const app = express();

const port = process.env.WIKI_DOWNLOADER_PORT;
const outputDirectory = process.env.WIKI_DOWNLOADER_OUTPUT_DIR;
const extractorUrl = process.env.WIKI_EXTRACTOR_URL;
const indexerUrl = process.env.WIKI_INDEXER_URL;

if (!port) {
    throw new Error('WIKI_DOWNLOADER_PORT is not set');
}

if (!outputDirectory) {
    throw new Error('WIKI_DOWNLOADER_OUTPUT_DIR is not set');
}

if (!extractorUrl) {
    throw new Error('WIKI_EXTRACTOR_URL is not set');
}

if (!indexerUrl) {
    throw new Error('WIKI_INDEXER_URL is not set');
}

/**
 * Downloads file from url to filesystem
 */
function download(url, outputDirectory, filename) {
    return new Promise((resolve, reject) => {
        const dl = new DownloaderHelper(url, outputDirectory, {
            fileName: filename,
        });
        dl.on('end', () => resolve());
        dl.on('error', (err) => reject(err));
        dl.start().catch(err => reject(err));
    })
}

app.use(cors());
app.use(express.json());
app.post('/download', async (req, res) => {
    const {urls} = req.body;
    console.log('Received urls', urls);
    res.set('Connection', 'close');
    res.send({result: 'ok'});

    for (const url of urls) {
        const name = url.split('/').pop()
        const fullPath = outputDirectory + name
        if (fs.existsSync(fullPath)) {
            console.log('File already exists:', name)
            continue
        }

        console.log('Downloading...')
        await download(url, outputDirectory, name);
        console.log('Downloaded!')
        fetch(extractorUrl + 'extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: name
            }),
        }).then()
        fetch(indexerUrl + 'index', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName: name
            }),
        }).then()
    }
    // todo send message to extractor
    // todo custom callback after download (for copy file and etc)
});

app.listen(port, () => console.log(`Started downloader server at http://localhost:${port}`));