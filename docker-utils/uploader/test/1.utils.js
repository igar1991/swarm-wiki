import {expect} from 'expect';
import {getActiveBatch} from "../utils.js";

describe('Uploader utils', () => {
    it('getActiveBatch', async () => {
        const batch = await getActiveBatch('http://localhost:1635/')
        console.log(batch)
    });
});