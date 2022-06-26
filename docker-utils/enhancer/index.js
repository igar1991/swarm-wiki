import express from 'express';
import cors from 'cors';
import multer from "multer";
import {uploadContent} from "./utils.js";

const upload = multer({storage: multer.memoryStorage()})
const app = express();

const port = process.env.WIKI_ENHANCER_PORT;
const uploaderUrl = process.env.WIKI_UPLOADER_URL;

if (!port) {
    throw new Error('WIKI_ENHANCER_PORT is not set');
}

if (!uploaderUrl) {
    throw new Error('WIKI_UPLOADER_URL is not set');
}

console.log('WIKI_ENHANCER_PORT', port);
console.log('WIKI_UPLOADER_URL', uploaderUrl);

let status = 'ok'

app.use(cors());
app.post('/enhance-page', upload.none(), async (req, res) => {
    const {key, page} = req.body;

    console.log('/enhance-page', key, 'page length', page.length);
    res.send({result: 'ok', status});

    if (status !== 'ok') {
        console.log('status', status, 'skip')
        return
    }

    try {
        const response = await uploadContent(uploaderUrl, key, page, 'page')
        console.log('response', response);
        status = response.status
    } catch (e) {
        console.log('enhancer page error', e);
    }
});

app.post('/enhance-file', upload.single('file'), async (req, res) => {
    const {key} = req.body
    const file = req.file

    console.log('/enhance-file', key, 'file size', file.size);
    res.send({result: 'ok', status});

    if (status !== 'ok') {
        console.log('status', status, 'skip')
        return
    }

    try {
        const response = await uploadContent(uploaderUrl, key, file.buffer, 'file')
        console.log('response', response);
        status = response.status
    } catch (e) {
        console.log('enhancer file error', e);
    }
});

app.listen(port, () => console.log(`Started enhancer server at http://localhost:${port}`));