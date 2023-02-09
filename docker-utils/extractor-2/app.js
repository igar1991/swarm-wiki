import express from 'express';
import cors from 'cors';
import fs from 'fs';
import {getList, insertImagesToPage, isCorrectMode, processContent, uploadContent} from "./utils.js";
import {parse} from "node-html-parser";
import path from 'path';

const app = express();

const articlesFile = process.env.WIKI_EXTRACTOR_2_ARTICLES_FILE;
const exceptionsFile = process.env.WIKI_EXTRACTOR_2_EXCEPTIONS_FILE;
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
    throw new Error(`Articles list file does not exist ${outputDir + articlesFile}`);
}

// todo move cache dir to env variable
if (!fs.existsSync(outputDir + 'cache')) {
    throw new Error(`Cache directory does not exist`);
}

if (!fs.existsSync(outputDir + exceptionsFile)) {
    throw new Error(`Exceptions list file does not exist`);
}

console.log('WIKI_EXTRACTOR_2_ARTICLES_FILE', articlesFile);
console.log('WIKI_EXTRACTOR_2_EXCEPTIONS_FILE', exceptionsFile);
console.log('WIKI_EXTRACTOR_2_CONCURRENCY', concurrency);
console.log('WIKI_DOWNLOADER_OUTPUT_DIR', outputDir);
console.log('WIKI_EXTRACTOR_2_MODE', mode);

app.use(cors());
app.use(express.json());
app.post('/extract', async (req, res, next) => {
    const {fileName, lang} = req.body;

    console.log('fileName', fileName, 'lang', lang);

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
        beeUrl
    })

    console.log('Done!')
});

app.post('/recover', async (req, res, next) => {
    const {pageName} = req.body;

    try {
        console.log('received pageName', pageName);
        if (!pageName) {
            return next(`Page name is empty`);
        }

        let realPath = ''
        const pageFilePath = path.join(outputDir, `A/${pageName}`);
        const exceptionFilePath = path.join(outputDir, '_exceptions', `A%2f${pageName}`)
        if (fs.existsSync(exceptionFilePath)) {
            realPath = exceptionFilePath
        } else if(fs.existsSync(pageFilePath)){
            realPath = pageFilePath
        }

        if(!realPath){
            return next(`Page file does not exists in main dir and exceptions`);
        }

        try {
            fs.statSync(pageFilePath);
        } catch (e) {
            const message = `path "${pageFilePath}" exists, but this is not a file`
            console.log(message);
            return next(message)
        }

        const page = fs.readFileSync(pageFilePath, {encoding: 'utf8'});
        const parsed = parse(page);
        const preparedPage = await insertImagesToPage(parsed, outputDir);
        res.send(preparedPage);
        console.log('content prepared, send to uploader', pageName);
        const saveKey = `wiki_page_en_${pageName}`;
        const cacheFileName = `${outputDir}cache/${pageName}`;
        console.log('content for pageName uploading', saveKey);
        await uploadContent(uploaderUrl, saveKey, cacheFileName, preparedPage);
        console.log('content for pageName uploaded', saveKey);
    } catch (e) {
        console.log(`error on recovering (${pageName}): ${e.message}`);
    }
});

export default app;
