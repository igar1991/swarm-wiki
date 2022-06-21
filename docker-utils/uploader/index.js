import express from 'express';
import cors from 'cors';
import {Bee, BeeDebug} from '@ethersphere/bee-js';

const app = express();

const port = process.env.WIKI_UPLOADER_PORT;
const privateKey = process.env.WIKI_UPLOADER_PRIVATE_KEY;
const beeUrl = process.env.WIKI_BEE_URL;
const beeDebugUrl = process.env.WIKI_BEE_DEBUG_URL;

if (!port) {
    throw new Error('WIKI_UPLOADER_PORT is not set');
}

if (!privateKey) {
    throw new Error('WIKI_UPLOADER_PRIVATE_KEY is not set');
}

if (!beeUrl) {
    throw new Error('WIKI_BEE_URL is not set');
}

if (!beeDebugUrl) {
    throw new Error('WIKI_BEE_DEBUG_URL is not set')
}

console.log('WIKI_UPLOADER_PORT', port);
console.log('WIKI_UPLOADER_PRIVATE_KEY length', privateKey.length);
console.log('WIKI_BEE_URL', beeUrl);
console.log('WIKI_BEE_DEBUG_URL', beeDebugUrl);

async function uploadData(key, data, reference) {
    const beeDebug = new BeeDebug(beeDebugUrl)
    const allBatch = await beeDebug.getAllPostageBatch()
    const usableBatch = allBatch.filter(batch => batch.usable)
    if (allBatch.length === 0 || usableBatch.length === 0) {
        console.error('No batch found or no usable batch found')
        return
    }

    const batchId = usableBatch[0].batchID
    const bee = new Bee(beeUrl)
    const topic = bee.makeFeedTopic(key)
    const feedWriter = bee.makeFeedWriter('sequence', topic, privateKey)
    const uploadedData = await bee.uploadData(batchId, data)
    const feedReference = await feedWriter.upload(batchId, uploadedData.reference)

    return {
        feedReference,
        uploadedData
    }
}

async function downloadPage(key){
    const bee = new Bee(beeUrl)
    const topic = bee.makeFeedTopic(key)
    const feedReader = bee.makeFeedReader('sequence', topic, '0xfBfCa6582d64964D746a166c466d392053b178b3')
    const data = await feedReader.download()
    console.log('data', data)
    const content = (await bee.downloadData(data.reference)).text()
    console.log('content', content)
}

// (async function(){
//     await downloadPage('wiki_page_Atimw')
// })()

app.use(cors());
app.use(express.json());
app.post('/upload-page', async (req, res) => {
    const {key, page} = req.body;
    console.log('/upload-page', key, 'page length', page.length);
    try {
        const data = await uploadData(key, page)
        console.log('uploaded data', data)
        res.send({result: 'ok', data});
    } catch (error) {
        res.send({result: 'error', error});
    }
});

app.post('/upload-redirect', async (req, res) => {
    const {key, reference} = req.body;
    console.log('Received', 'key', key, 'reference', reference);
    // todo implement
    res.send({result: 'ok'});
});

app.post('/upload-file', async (req, res) => {
    const {urls} = req.body;
    console.log('Received', urls);
    // todo implement
    res.send({result: 'ok'});
});

app.listen(port, () => console.log(`Started uploader server at http://localhost:${port}`));