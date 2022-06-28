import express from 'express';
import cors from 'cors';
import multer from "multer";
import {uploadContent} from "./utils.js";

const upload = multer({
    storage: multer.memoryStorage(),
    fieldSize: 1024 * 1024 * 500
})
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
app.post('/enhance-page', upload.single('file'), async (req, res, next) => {
    const {key, meta} = req.body;
    const file = req.file?.buffer

    if (!key) {
        return next('Empty key')
    }

    if (!file) {
        return next('Empty file')
    }

    if (!meta) {
        return next('Empty meta')
    }

    console.log('/enhance-page', key, 'page length', file.length);
    res.send({result: 'ok', status});

    if (status !== 'ok') {
        console.log('status', status, 'skip')
        return
    }

    try {
        const response = await uploadContent(uploaderUrl, key, file, meta, 'page')
        console.log('response', response);
        status = response.status
    } catch (e) {
        console.log('enhancer page error', e);
    }
});

app.listen(port, () => console.log(`Started enhancer server at http://localhost:${port}`));