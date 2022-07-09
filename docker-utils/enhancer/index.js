import express from 'express';
import cors from 'cors';
import multer from "multer";
import {uploadContent} from "./utils.js";
import {waitUploader} from "../utils/utils.js";

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

app.use(cors());
app.post('/enhance-page', upload.single('file'), async (req, res, next) => {
    const {key, meta, keyLocalIndex} = req.body;
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

    if (!keyLocalIndex) {
        return next('Empty keyLocalIndex')
    }

    console.log('/enhance-page', key, 'page length', file.length);
    res.send({result: 'ok'});

    try {
        await waitUploader(uploaderUrl)
        await uploadContent(uploaderUrl, key, keyLocalIndex, file, meta, 'page')
    } catch (e) {
        console.log('enhancer error', e);
    }
});

app.listen(port, () => console.log(`Started enhancer server at http://localhost:${port}`));