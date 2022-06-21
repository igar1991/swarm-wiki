import {parseList} from '../utils.js';
import {expect} from 'expect';
import fs from 'fs';

describe('Extractor utils', () => {
    it('parseList', async () => {
        const data = fs.readFileSync('test/data/wikipedia_en_100_maxi_2022-06.zim.out.txt',{encoding: 'utf8'});
        const result = parseList(data)
        expect(result).toHaveLength(7731)
        expect(result.filter(item => item.type === 'index')).toHaveLength(2)
        expect(result.filter(item => item.type === 'redirect')).toHaveLength(3717)
        expect(result.filter(item => item.type === 'file')).toHaveLength(44)
        expect(result.filter(item => item.type === 'image')).toHaveLength(3856)
        expect(result.filter(item => item.type === 'meta')).toHaveLength(11)
        expect(result.filter(item => item.type === 'page')).toHaveLength(101)
        const pages = result.filter(item => item.type === 'page')
        const mainPage = pages[100]
        expect(mainPage.title).toEqual('Main Page')
        expect(mainPage.index).toEqual('3792')
        expect(mainPage.mime_type).toEqual('text/html')
        expect(mainPage.item_size).toEqual('7972')

        const firstPage = pages[0]
        expect(firstPage.title).toEqual('Acetic acid')
        expect(firstPage.index).toEqual('91')
        expect(firstPage.mime_type).toEqual('text/html')
        expect(firstPage.item_size).toEqual('176596')
    });
});