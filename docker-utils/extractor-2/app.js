import express from 'express';
import cors from 'cors';
import fs from 'fs';
import {getList, insertImagesToPage, isCorrectMode, processContent, uploadContent} from "./utils.js";
import {parse} from "node-html-parser";

const app = express();

const articlesFile = process.env.WIKI_EXTRACTOR_2_ARTICLES_FILE;
const exceptionsFile = process.env.WIKI_EXTRACTOR_2_EXCEPTIONS_FILE;
const resolverDirectory = process.env.WIKI_EXTRACTOR_2_RESOLVER_DIRECTORY;
const concurrency = Number(process.env.WIKI_EXTRACTOR_2_CONCURRENCY ? process.env.WIKI_EXTRACTOR_2_CONCURRENCY : 10);
const outputDir = process.env.WIKI_DOWNLOADER_OUTPUT_DIR;
const uploaderUrl = process.env.WIKI_UPLOADER_URL;
const mode = process.env.WIKI_EXTRACTOR_2_MODE ? process.env.WIKI_EXTRACTOR_2_MODE : 'common';
const privateKey = process.env.WIKI_UPLOADER_PRIVATE_KEY;
const beeUrl = process.env.WIKI_BEE_URL;

if (!articlesFile) {
    throw new Error('WIKI_EXTRACTOR_2_ARTICLES_FILE is not set');
}

if (!exceptionsFile) {
    throw new Error('WIKI_EXTRACTOR_2_EXCEPTIONS_FILE is not set');
}

if (!resolverDirectory) {
    throw new Error('WIKI_EXTRACTOR_2_RESOLVER_DIRECTORY is not set');
}

if (!concurrency) {
    throw new Error('WIKI_EXTRACTOR_2_CONCURRENCY is not set');
}

if (!outputDir) {
    throw new Error('WIKI_DOWNLOADER_OUTPUT_DIR is not set');
}

if (!uploaderUrl) {
    throw new Error('WIKI_UPLOADER_URL is not set');
}

if (!isCorrectMode(mode)) {
    throw new Error('WIKI_EXTRACTOR_2_MODE is not set or invalid');
}

if (mode === 'restore' && !(privateKey && beeUrl)) {
    throw new Error('WIKI_UPLOADER_PRIVATE_KEY or WIKI_BEE_URL is not set for mode "restore"');
}

if (!fs.existsSync(outputDir + articlesFile)) {
    throw new Error(`Articles list file does not exist`);
}

// todo move cache dir to env variable
if (!fs.existsSync(outputDir + 'cache')) {
    throw new Error(`Cache directory does not exist`);
}

if (!fs.existsSync(outputDir + exceptionsFile)) {
    throw new Error(`Exceptions list file does not exist`);
}

if (!fs.existsSync(outputDir + resolverDirectory)) {
    throw new Error(`Resolver directory does not exist`);
}

console.log('WIKI_EXTRACTOR_2_ARTICLES_FILE', articlesFile);
console.log('WIKI_EXTRACTOR_2_EXCEPTIONS_FILE', exceptionsFile);
console.log('WIKI_EXTRACTOR_2_CONCURRENCY', concurrency);
console.log('WIKI_DOWNLOADER_OUTPUT_DIR', outputDir);
console.log('WIKI_EXTRACTOR_2_MODE', mode);

function isCorrectChunkLength(chunkLength) {
    return chunkLength === 64
}

app.use(cors());
app.use(express.json());
app.post('/extract', async (req, res, next) => {
    const {fileName, lang} = req.body;

    if (!fileName) {
        return next(`File param is empty`);
    }

    if (!lang) {
        return next(`Lang is empty`);
    }

    res.send({result: 'ok'});

    const articles = await getList(outputDir + articlesFile);
    const exceptions = await getList(outputDir + exceptionsFile);

    await processContent({
        zimContentDirectory: outputDir,
        uploaderUrl,
        articles,
        exceptions,
        lang,
        concurrency,
        mode,
        privateKey,
        beeUrl,
        resolverDirectory: outputDir + resolverDirectory
    })

    console.log('Done!')
});

app.get('/recover/:chunk', async (req, res, next) => {
    const {chunk} = req.params;

    console.log('received chunk', chunk);
    if (!isCorrectChunkLength(chunk.length)) {
        return next(`Chunk length is not correct`);
    }

    const chunkPath = outputDir + resolverDirectory + chunk
    if (!fs.existsSync(chunkPath)) {
        console.log('chunk does not exist', chunkPath);
        return next(`Chunk does not exist: ${chunk}`);
    }

    const pageName = fs.readFileSync(chunkPath, {encoding: 'utf8'});
    console.log('preparing content for chunk', chunk);
    const pageFilePath = outputDir + 'A/' + pageName
    const page = fs.readFileSync(pageFilePath, {encoding: 'utf8'});
    const parsed = parse(page)
    const preparedPage = await insertImagesToPage(parsed, outputDir)
    res.send(preparedPage);
    console.log('content for chunk prepared, send to uploader', chunk);
    // todo make language as changable param
    const saveKey = `wiki_page_en_${pageName}`
    const cacheFileName = `${outputDir}cache/${pageName}`
    console.log('content for chunk uploading', saveKey, chunk);
    await uploadContent(uploaderUrl, saveKey, cacheFileName, preparedPage)
    console.log('content for chunk uploaded', saveKey, chunk);
});

export default app;
