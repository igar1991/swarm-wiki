import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';

const port = process.env.WIKI_INDEXER_PORT;
const uploaderUrl = process.env.WIKI_UPLOADER_URL;
const keyPrefix = process.env.WIKI_SWARM_PREFIX;
const MIDDLE_PREFIX_PAGE = 'index_'

if (!port) {
    throw new Error('WIKI_INDEXER_PORT is not set');
}

if (!uploaderUrl) {
    throw new Error('WIKI_UPLOADER_URL is not set');
}

if (!keyPrefix) {
    throw new Error('WIKI_SWARM_PREFIX is not set');
}

console.log('WIKI_INDEXER_PORT', port);
console.log('WIKI_UPLOADER_URL', uploaderUrl);
console.log('WIKI_SWARM_PREFIX', keyPrefix);

async function run() {
    console.log('Indexing started...')
    console.log('Indexing complete!')

    return 'Hello World, Index'
}

const app = express();
app.use(cors());
app.use(express.json());
app.post('/index', async (req, res) => {
    const {fileName} = req.body;
    console.log('Indexing started by web command', 'fileName', fileName)
    res.send({result: 'ok'});

    const data = await run()
    const key = keyPrefix + MIDDLE_PREFIX_PAGE + 'all'
    const response = await (await fetch(uploaderUrl + 'upload', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            key,
            page: data
        })
    })).json()

    console.log('response', response);
});
app.listen(port, () => console.log(`Started indexer server at http://localhost:${port}`));