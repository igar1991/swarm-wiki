import express from 'express';
import cors from 'cors';
import {Wallet} from 'ethers';
import {Bee, BeeDebug} from '@ethersphere/bee-js';
import {createClient} from 'redis';

const app = express();

const port = process.env.WIKI_UPLOADER_PORT;
const privateKey = process.env.WIKI_UPLOADER_PRIVATE_KEY;
const beeUrl = process.env.WIKI_BEE_URL;
const beeDebugUrl = process.env.WIKI_BEE_DEBUG_URL;
const redisUrl = process.env.WIKI_UPLOADER_REDIS;

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

if (!redisUrl) {
    throw new Error('WIKI_UPLOADER_REDIS is not set')
}

console.log('WIKI_UPLOADER_PORT', port);
console.log('WIKI_UPLOADER_PRIVATE_KEY length', privateKey.length);
console.log('WIKI_BEE_URL', beeUrl);
console.log('WIKI_BEE_DEBUG_URL', beeDebugUrl);
console.log('WIKI_UPLOADER_REDIS', redisUrl);

const client = createClient({
    url: redisUrl
});
client.on('error', (err) => {
    // console.log('Redis Client Error', err)
});

async function uploadData(privateKey, key, data, reference) {
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

async function downloadFeedData(privateKey, key) {
    const wallet = new Wallet(privateKey)
    const bee = new Bee(beeUrl)
    const topic = bee.makeFeedTopic(key)
    const feedReader = bee.makeFeedReader('sequence', topic, wallet.address)
    return feedReader.download()
}

// async function downloadPage(key) {
//     const bee = new Bee(beeUrl)
//     const data = await downloadFeedData(key)
//     console.log('feed data', data)
//     const content = (await bee.downloadData(data.reference)).text()
//     console.log('content', content)
// }

app.use(cors());
app.use(express.json({limit: 1024 * 1024 * 20}));
app.post('/upload-page', async (req, res) => {
    const {key, page} = req.body;
    console.log('/upload-page', key, 'page length', page.length);
    res.send({result: 'ok'});
    try {
        // todo get date of saving and compare it with allowed date. For download feed info if record older than 1 day
        let storedInfo = await client.get(key)
        storedInfo = storedInfo ? JSON.parse(storedInfo) : {}
        console.log('storedInfo', storedInfo)
        let feedData = null
        try {
            feedData = await downloadFeedData(privateKey, key)
        } catch (e) {

        }

        console.log('feedData', feedData)
        if (feedData && feedData.reference && storedInfo.uploadedData && storedInfo.uploadedData.reference === feedData.reference) {
            console.log('feed reference the same as in db, skipping', 'key', key)
        } else {
            console.log('uploading...')
            const data = await uploadData(privateKey, key, page)
            console.log('uploaded data result', data)
            // todo save date of saving
            await client.set(key, JSON.stringify({
                ...data,
            }))
        }
    } catch (error) {
        console.log('error', error)
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

client.connect().then(async () => {
    await client.configSet('save', '5 1');
})
app.listen(port, () => console.log(`Started uploader server at http://localhost:${port}`));