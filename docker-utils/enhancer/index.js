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
app.use(express.json());
app.post('/enhance', async (req, res) => {
    const {key, page} = req.body;
    console.log('/enhance', key, 'page length', page.length);

    await fetch(uploaderUrl + 'upload-page', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        // todo concat key from env
        body: JSON.stringify({
            key,
            page
        })
    })

    res.send({result: 'ok'});
});

app.listen(port, () => console.log(`Started enhancer server at http://localhost:${port}`));