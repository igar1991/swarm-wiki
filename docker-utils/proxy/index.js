import app from './app.js';

const port = process.env.WIKI_EXTRACTOR_2_PORT;
if (!port) {
    throw new Error('WIKI_PROXY_PORT is not set');
}

console.log('WIKI_PROXY_PORT', port);

app.listen(port, () => console.log(`Started proxy server at http://localhost:${port}`));
