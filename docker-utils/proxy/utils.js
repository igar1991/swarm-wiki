import fetch, {FormData} from "node-fetch";
import fs from 'fs'

/**
 * Sends page name to recovery service and returns page data
 */
export async function recoverPage(extractorUrl, pageName) {
    const form = new FormData();
    form.append('pageName', pageName);

    return (await fetch(extractorUrl + 'recover', {
        method: 'POST',
        body: form
    })).text()
}

export function getList(path) {
    const list = fs.readFileSync(path, {encoding: 'utf8'});

    return list
        .split('\n')
}

export function getAllPages(workingDirectory, articlesFile, identity) {
    // su many results because of limits in js for more than 8 millions
    let result0 = {}
    let result1 = {}
    let result2 = {}
    const cachedList = workingDirectory + identity
    const cachedList0 = cachedList + '.0'
    const cachedList1 = cachedList + '.1'
    const cachedList2 = cachedList + '.2'
    if (fs.existsSync(cachedList)) {
        console.log('found cached list')
        result0 = JSON.parse(fs.readFileSync(cachedList0, {encoding: 'utf8'}))
        result1 = JSON.parse(fs.readFileSync(cachedList1, {encoding: 'utf8'}))
        result2 = JSON.parse(fs.readFileSync(cachedList2, {encoding: 'utf8'}))
        console.log('cached list converted to json')
    } else {
        const list = getList(workingDirectory + articlesFile)
        for (const [index, item] of list.entries()) {
            console.log(`getting page ${index + 1}/${list.length}`)
            const path = workingDirectory + 'cache/' + item
            try {
                const json = JSON.parse(fs.readFileSync(path, {encoding: 'utf8'}))
                if (index < 8000000) {
                    result0[json.topic] = item
                } else if (index >= 8000000 && index < 16000000) {
                    result1[json.topic] = item
                } else if (index >= 16000000 && index < 24000000) {
                    result2[json.topic] = item
                }
            } catch (e) {
                console.log('can not read file', path)
            }

        }

        console.log('saving cached list...')
        fs.writeFileSync(cachedList0, JSON.stringify(result0))
        fs.writeFileSync(cachedList1, JSON.stringify(result1))
        fs.writeFileSync(cachedList2, JSON.stringify(result2))
        console.log('cached list saved')
    }

    return {result0, result1, result2}
}
