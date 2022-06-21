import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

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
app.use(express.json({limit: 1024 * 1024 * 200}));
app.post('/enhance', async (req, res) => {
    const {key, page} = req.body;
    console.log('/enhance', key, 'page length', page.length);
    res.send({result: 'ok'});

    try {
        const response = await (await fetch(uploaderUrl + 'upload-page', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key,
                page
            })
        })).json()

        console.log('response', response);
    } catch (e) {
        console.log('enhancer error', e);
    }
});

app.listen(port, () => console.log(`Started enhancer server at http://localhost:${port}`));