import {
    extractKeyFromExceptionItem,
    getList,
    insertImagesToPage
} from '../utils.js';
import {expect} from 'expect';
import fs from 'fs';
import {parse} from "node-html-parser";

describe('Extractor utils', () => {
    it('insertImagesToPage', async () => {
        const data = fs.readFileSync(`./test/data/10-Piece_handicap`, {encoding: 'utf8'});
        const parsed = parse(data);
        const preparedPage = await insertImagesToPage(parsed, 'test/data/');
        fs.writeFileSync(`./test/out.html`, preparedPage);
    });

    it('get articles with images', async () => {
        const list = await getList(`/Users/test/Downloads/zim-big/articles-list.txt`);
        for (const [index, key] of list.entries()) {

            if (index > 50000) break;
            // console.log(`article ${index + 1} of ${list.length}`);
            const path = `/Users/test//Downloads/zim-big/A/${key}`
            if (!fs.existsSync(path)) {
                continue
            }

            if (!fs.lstatSync(path).isFile()) {
                continue
            }

            const parsed = parse(fs.readFileSync(path, {encoding: 'utf8'}));
            const imgs = parsed.querySelectorAll('img')

            if (imgs.length > 0) {
                console.log(`${index + 1} of ${list.length}`);
                console.log(key);
                console.log(imgs.map(img => img.attributes.src));
            }
        }
    });

    it('extractKeyFromExceptionItem', async () => {
        const list = await getList(`test/data/exceptions-list.txt`);
        for (const key of list) {
            // console.log(key)

            if (['X%2ffulltext%2fxapian', 'X%2ftitle%2fxapian'].includes(key)) {
                continue
            }
            const decodedKey = extractKeyFromExceptionItem(key);
            console.log(key, '=>', decodedKey);
        }
    });
});