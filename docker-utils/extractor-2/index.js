import app from './app.js';

const port = process.env.WIKI_EXTRACTOR_2_PORT;
if (!port) {
    throw new Error('WIKI_EXTRACTOR_2_PORT is not set');
}

console.log('WIKI_EXTRACTOR_2_PORT', port);

app.listen(port, () => console.log(`Started extractor-2 server at http://localhost:${port}`));
