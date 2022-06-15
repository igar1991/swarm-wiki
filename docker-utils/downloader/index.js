import express from 'express';
import cors from "cors";

const app = express();

const port = process.env.WIKI_DOWNLOADER_PORT;
// todo get destination directory
if (!port) {
    throw new Error('WIKI_DOWNLOADER_PORT is not set');
}

app.use(cors());
app.use(express.json());

app.post('/download', async (req, res) => {
    const {urls} = req.body;
    console.log(urls);
    // todo run server that accept POST requests with zim file and save it to disk
    // todo send message to extractor
    // todo check for big files (write directly to disk)
    // todo custom callback after download (for copy file and etc)
    res.send({result: 'ok'});
});

app.listen(port, () => console.log(`Started server at http://localhost:${port}`));