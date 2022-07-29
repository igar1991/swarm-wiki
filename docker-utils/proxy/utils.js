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
    let result = {}
    const cachedList = workingDirectory + identity
    if (fs.existsSync(cachedList)) {
        console.log('found cached list')
        result = JSON.parse(fs.readFileSync(cachedList, {encoding: 'utf8'}))
        console.log('cached list converted to json')
    } else {
        const list = getList(workingDirectory + articlesFile)
        for (const [index, item] of list.entries()) {
            console.log(`getting page ${index + 1}/${list.length}`)
            const path = workingDirectory + 'cache/' + item
            try {
                const json = JSON.parse(fs.readFileSync(path, {encoding: 'utf8'}))
                result[json.topic] = item
            } catch (e) {
                console.log('can not read file', path)
            }

        }

        console.log('saving cached list...')
        fs.writeFileSync(cachedList, JSON.stringify(result))
        console.log('cached list saved')
    }

    return result
}
