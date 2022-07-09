import {expect} from 'expect';
import {getActiveBatch, getDataReference} from "../utils.js";
import fs from 'fs'
import {Bee} from "@ethersphere/bee-js";

describe('Uploader utils', () => {
    it('getActiveBatch', async () => {
        const batch = await getActiveBatch('http://localhost:1635/')
        console.log(batch)
    });

    it('getDataReference', async () => {
        const data = Uint8Array.from(
            fs.readFileSync('./test/files/election.html')
            // 'hello'
        )
        const reference = await getDataReference(data)
        console.log('bmt reference', reference)

        const bee = new Bee('http://localhost:1633/')
        const beeReference = await bee.uploadData('02d7098c78fedb681effa1429f90c4cc7b854bef79b2390d5285beffd2de9a36',data,{
            pin: true
        })
        console.log('beeReference', beeReference)
    });
});