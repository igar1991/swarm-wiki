import app from './app.js';

const port = process.env.WIKI_EXTRACTOR_PORT;
if (!port) {
    throw new Error('WIKI_EXTRACTOR_PORT is not set');
}

console.log('WIKI_EXTRACTOR_PORT', port);

app.listen(port, () => console.log(`Started extractor server at http://localhost:${port}`));
