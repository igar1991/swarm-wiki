import express from 'express';
import cors from 'cors';

const app = express();

const port = process.env.WIKI_UPLOADER_PORT;

if (!port) {
    throw new Error('WIKI_UPLOADER_PORT is not set');
}

console.log('WIKI_UPLOADER_PORT', port);

app.use(cors());
app.use(express.json());
app.post('/upload-page', async (req, res) => {
    const {key, page} = req.body;
    console.log('/upload-page', key, 'page length', page.length);

    res.send({result: 'ok'});
});

app.post('/upload-redirect', async (req, res) => {
    const {urls} = req.body;
    console.log('Received', urls);
    // todo implement
    res.send({result: 'ok'});
});

app.post('/upload-file', async (req, res) => {
    const {urls} = req.body;
    console.log('Received', urls);
    // todo implement
    res.send({result: 'ok'});
});

app.listen(port, () => console.log(`Started uploader server at http://localhost:${port}`));