import express from 'express';
import cors from 'cors';

const beeUrl = process.env.WIKI_BEE_URL;
const extractor2Url = process.env.WIKI_EXTRACTOR_2_URL;

if (!beeUrl) {
    throw new Error('WIKI_BEE_URL is not set');
}

if (!extractor2Url) {
    throw new Error('WIKI_EXTRACTOR_2_URL is not set');
}

console.log('WIKI_BEE_URL', beeUrl);
console.log('WIKI_EXTRACTOR_2_URL', extractor2Url);

function isCorrectChunkLength(chunkLength) {
    return chunkLength === 64
}

function isCorrectAddressLength(addressLength) {
    return addressLength === 40
}

const app = express();
app.use(cors());
app.use(express.json());
app.get('/feeds/:address/:chunk', async (req, res, next) => {
    // todo get address from config
    const allowedAddress = 'fffffA46f2883920e6f4976CF2F2E905523d80E6'
    const {address, chunk} = req.params;

    if (!isCorrectChunkLength(chunk.length)) {
        return next('Incorrect length of chunk');
    }

    if (!isCorrectAddressLength(address.length)) {
        return next('Incorrect length of address');
    }

    if (address.toLowerCase() !== allowedAddress.toLowerCase()) {
        return next('Address is not allowed');
    }

    let feedJson = null
    let data = null
    try {
        const url = `${beeUrl}feeds/${address}/${chunk}?type=sequence`
        console.log('fetching from bee node...', url)
        feedJson = (await fetch(url)).json();
        data = (await fetch(`${beeUrl}bytes/${feedJson.reference}`)).text();
        console.log('successfully fetched from bee node', url)
    } catch (e) {

    }

    try {
        if (!feedJson || !data) {
            data = (await fetch(`${extractor2Url}recover/${chunk}`)).text();
        }
    } catch (e) {

    }


    if (!data) {
        return next('Data is not available');
    }

    res.send(data);
});

app.get('/bytes/:chunk', async (req, res, next) => {
    const {chunk} = req.params;

    if (!isCorrectChunkLength(chunk.length)) {
        return next('Incorrect length of chunk');
    }

    const data = (await fetch(`${beeUrl}bytes/${chunk}`)).text();

    res.send(data);
});

export default app