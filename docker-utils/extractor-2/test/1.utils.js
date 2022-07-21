import {
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
});