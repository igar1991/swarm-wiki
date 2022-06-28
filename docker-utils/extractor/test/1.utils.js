import {
    extractFileById,
    extractFileByUrl,
    extractPage, getItemInfoByIndex, getItemInfoByUrl,
    getItemsCount,
    getPages, getTitlesList,
    insertImagesToPage,
    parseList, startParser
} from '../utils.js';
import {expect} from 'expect';
import fs from 'fs';

describe('Extractor utils', () => {
    it('parseList', async () => {
        const data = fs.readFileSync('test/data/wikipedia_en_100_maxi_2022-06.zim.out.txt', {encoding: 'utf8'});
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

    it('extractFile', async () => {
        const zimdumpCustom = 'docker run --rm -v $(pwd):/app -w /app -i zimdump zimdump'
        const data = await extractFileById(zimdumpCustom, '4184', 'test/data/wikipedia_en_100_maxi_2022-06.zim')
        fs.writeFileSync('hello.webp', data)
    });

    it('getItemsCount', async () => {
        const zimdumpCustom = 'docker run --rm -v $(pwd):/app -w /app -i zimdump zimdump'
        const count = await getItemsCount(zimdumpCustom, 'test/data/wikipedia_en_100_maxi_2022-06.zim')
        expect(count).toEqual(7731)
    });

    it('extractFileByUrl', async () => {
        const zimdumpCustom = 'docker run --rm -v /Users/test/Downloads/out/:/app -w /app -i zimdump zimdump'
        const data = await extractFileByUrl(zimdumpCustom, 'I/Bundesarchiv_Bild_183-J15480%2C_Mailand%2C_Besetzung_durch_SS-_Leibstandarte_"Adolf_Hitler".jpg.webp', 'wikipedia_ru_top_maxi_2022-06.zim')
        console.log(data)
    });

    it('insertImagesToPage', async () => {
        const zimdumpCustom = 'docker run --rm -v $(pwd):/app -w /app -i zimdump zimdump'
        const zimPath = 'test/data/wikipedia_en_100_maxi_2022-06.zim'
        const data = await extractPage(zimdumpCustom, '2019', zimPath)
        const pageWithImages = await insertImagesToPage(zimdumpCustom, data, zimPath)
        fs.writeFileSync('hello.html', pageWithImages)
    }).timeout(0);

    it('insertImagesToPage full', async () => {
        // 35 minutes for 7731 items. 31 pages with images, other - redirects
        // 4 minutes inside Docker container

        // const zimdumpCustom = 'docker run --rm -v /Users/test/Downloads/:/app -w /app -i zimdump zimdump'
        // const zimPath = 'out/wikipedia_ru_top_maxi_2022-06.zim'

        const zimdumpCustom = 'docker run --rm -v /Users/test/Downloads/out/:/app -w /app -i zimdump zimdump'
        const zimPath = 'wikipedia_en_100_maxi_2022-06.zim'

        await startParser(zimdumpCustom, zimPath,
            async (item, data) => {
                console.log(item, data ? data.length : 'empty data')
                if (data) {
                    const pageWithImages = await insertImagesToPage(zimdumpCustom, data, zimPath)
                    console.log('pageWithImages length', pageWithImages.length)
                } else {
                    // it is redirect, also check for cache before processing
                }
            },
            async item => {
                // get info from cache
                return true
            },
            (index, count) => {
                console.log(`COUNTER ${index + 1}/${count}`)
            })
    }).timeout(0);

    it('getTitlesList', async () => {
        // ~40 seconds for ~100 gb file, it faster for 1.4 times that finding all articles by indexes
        const zimdumpCustom = 'docker run --rm -v /Users/test/Downloads/out/:/app -w /app -i zimdump zimdump'
        const filePath = 'wikipedia_en_100_maxi_2022-06.zim'
        const count = await getItemsCount(zimdumpCustom, filePath)
        console.log('count', count)
        const titles = await getTitlesList(zimdumpCustom, filePath)
        console.log('titles count', titles.length)
        expect(titles.length).toEqual(3819)
    }).timeout(0);
});