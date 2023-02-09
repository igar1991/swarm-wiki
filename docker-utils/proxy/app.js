import express from 'express';
import cors from 'cors';
import fetch from "node-fetch";
import {getAllPages, recoverPage} from "./utils.js";

const beeUrl = process.env.WIKI_BEE_URL;
const extractor2Url = process.env.WIKI_EXTRACTOR_2_URL;
const outputDir = process.env.WIKI_DOWNLOADER_OUTPUT_DIR;
const articlesFile = process.env.WIKI_EXTRACTOR_2_ARTICLES_FILE;


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

// console.log('getting all pages...');
// const {result0, result1, result2} = getAllPages(outputDir, articlesFile, 'topic_pagename_cache')
// console.log('got all pages');

async function recoverPageWeb(res, next, pageName){
    console.log(`trying to recover the page: ${pageName}`);
    try {
        const cache = await recoverPage(extractor2Url, pageName);
        res.send({cache});
    } catch (e) {
        console.log(`recovering failed: ${e.message}`);
        return next('Data is not available');
    }
}

const app = express();
app.use(cors());
app.use(express.json());
app.get('/feeds/:address/:chunk', async (req, res, next) => {
    // todo get address from config
    const allowedAddress = 'fffffA46f2883920e6f4976CF2F2E905523d80E6'
    const {address, chunk} = req.params;
    const {pageName, force} = req.query;

    if (!isCorrectChunkLength(chunk.length)) {
        return next('Incorrect length of chunk');
    }

    if (!isCorrectAddressLength(address.length)) {
        return next('Incorrect length of address');
    }

    if (address.toLowerCase() !== allowedAddress.toLowerCase()) {
        return next('Address is not allowed');
    }

    if (force === '1' && pageName){
        await recoverPageWeb(res, next, pageName);

        return
    }

    let feedFetchResponse = null
    let feedResponseData = null
    let feedReferenceData = null
    try {
        const url = `${beeUrl}feeds/${address}/${chunk}?type=sequence`
        console.log('fetching from bee node...', url)
        feedFetchResponse = await fetch(url)
        feedResponseData = await feedFetchResponse.json();
        console.log('feed response from bee node', feedResponseData)
        if (feedResponseData.code) {
            console.log('feed response data contains a code, recover...');
            await recoverPageWeb(res, next, pageName);

            return
        } else {
            console.log('fetching feed reference content...');
            feedReferenceData = await (await fetch(
                `${beeUrl}bytes/${feedResponseData.reference}`)).text();
            if (!feedReferenceData){
                throw new Error('empty content of feed reference data')
            }

            // check that content is not json (with error for example)
            let parsed;
            try {
                parsed = JSON.parse(feedReferenceData);
            } catch (e) {

            }

            if (parsed && parsed.code) {
                throw new Error(
                    `parsed content data is json with error code: ${JSON.stringify(
                        parsed)}`);
            }
            console.log('successfully fetched from bee node', url);
        }

        // if context exists in node - response the same as node
        const headers = feedFetchResponse.headers
        res.set({
            'swarm-feed-index': headers.get('swarm-feed-index'),
            'swarm-feed-index-next': headers.get('swarm-feed-index-next'),
            'access-control-expose-headers': headers.get('access-control-expose-headers'),
        })

        return res.send(feedResponseData);
    } catch (e) {
        console.log(`error on fetching data: ${e.message}`);
    }

    if (!pageName) {
        return next('Page content not found in swarm and in cache');
    }

    // in other case - get cached data and return it
    await recoverPageWeb(res, next, pageName)
});

app.get('/bytes/:chunk', async (req, res, next) => {
    const {chunk} = req.params;

    if (!isCorrectChunkLength(chunk.length)) {
        return next('Incorrect length of chunk');
    }

    const data = await (await fetch(`${beeUrl}bytes/${chunk}`)).text();

    res.send(data);
});

export default app