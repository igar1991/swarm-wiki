import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';

const port = process.env.WIKI_INDEXER_PORT;

if (!port) {
    throw new Error('WIKI_INDEXER_PORT is not set');
}

console.log('WIKI_INDEXER_PORT', port);

async function run() {
    console.log('Indexing started...')
    console.log('Indexing complete!')
}

const app = express();
app.use(cors());
app.use(express.json());
app.post('/index', async (req, res) => {
    const {fileName} = req.body;
    console.log('Indexing started by web command', 'fileName', fileName)
    run().then(data => {
        // todo send callback with index to swarm uploader
    })

    res.send({result: 'ok'});
});
app.listen(port, () => console.log(`Started indexer server at http://localhost:${port}`));