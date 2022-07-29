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

console.log('getting all pages...');
const {result0, result1, result2} = getAllPages(outputDir, articlesFile, 'topic_pagename_cache')
console.log('got all pages');

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
    let feedResponse = null
    try {
        const url = `${beeUrl}feeds/${address}/${chunk}?type=sequence`
        console.log('fetching from bee node...', url)
        feedResponse = await fetch(url)
        feedJson = await feedResponse.json();
        console.log('feed response from bee node', feedJson)
        if (!feedJson.code) {
            data = await (await fetch(`${beeUrl}bytes/${feedJson.reference}`)).text();
            console.log('successfully fetched from bee node', url)
        }
    } catch (e) {

    }

    // if context exists in node - response the same as node
    if (feedJson && data) {
        const headers = feedResponse.headers
        res.set({
            'swarm-feed-index': headers.get('swarm-feed-index'),
            'swarm-feed-index-next': headers.get('swarm-feed-index-next'),
            'access-control-expose-headers': headers.get('access-control-expose-headers'),
        })

        return res.send(feedJson);
    }

    let pageName = result0[chunk];

    if (!pageName) {
        pageName = result1[chunk];
    }

    if (!pageName) {
        pageName = result2[chunk];
    }

    if (!pageName) {
        return next('Page name not found');
    }

    console.log('found page name', pageName);
    // in other case - get cached data and return it
    try {
        data = await recoverPage(extractor2Url, pageName);
    } catch (e) {

    }

    if (!data) {
        return next('Data is not available');
    }

    res.send({cache: data});
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