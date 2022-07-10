import fetch from 'node-fetch';
import express from 'express';
import cors from 'cors';
import {sleep} from "../utils/utils.js";

const baseUrl = process.env.WIKI_BASE
let zimsCheck = process.env.WIKI_ZIMS_CHECK
let downloaderUrl = process.env.WIKI_DOWNLOADER_URL
let port = process.env.WIKI_TRIGGER_PORT

console.log(`WIKI_BASE`, baseUrl)
console.log(`WIKI_ZIMS_CHECK`, zimsCheck)
console.log(`WIKI_DOWNLOADER_URL`, downloaderUrl)
console.log(`WIKI_TRIGGER_PORT`, port)

if (!baseUrl) {
    throw new Error('WIKI_BASE is not set')
}

if (!zimsCheck) {
    throw new Error('WIKI_ZIMS_CHECK is not set')
}

if (!downloaderUrl) {
    throw new Error('WIKI_DOWNLOADER_URL is not set')
}

zimsCheck = zimsCheck.split(',').map(item => item.trim())

if (zimsCheck.length === 0) {
    throw new Error('WIKI_ZIMS_CHECK is empty')
}

/**
 * Parse html to an array of ZIM archives info
 */
function parseData(html) {
    const lines = html.split('\n').filter(item => item.startsWith('<a href="'))
    return lines.map(line => {
        const name = line.split('">')[1].split('</a>')[0]
        const a = `<a href="${name}">${name}</a>`
        const withoutA = line.replace(a, '').trim().split(' ')
        const size = Number(withoutA.filter(item => item.trim().length > 0)[2])
        const dateUnix = new Date(`${withoutA[0]} ${withoutA[1]}`).valueOf()

        return {
            name,
            date: dateUnix,
            size,
        }
    })
}

/**
 * Fins all passed ZIM archives in the wiki
 */
async function run() {
    console.log(`Loading ${baseUrl}`)
    const html = await (await fetch(baseUrl)).text()
    console.log('Loaded!')
    const urlsInfo = parseData(html)

    console.log(`Total ${urlsInfo.length} ZIM archives`)
    let found = []
    zimsCheck.forEach(item => {
        const [zimSearch, lang] = item.split('|')
        if (!lang) {
            throw new Error('Language is not defined, use format "name|lang" for packages')
        }

        const zims = urlsInfo.filter(item => item.name.startsWith(zimSearch))
        if (zims.length === 1) {
            found.push({zim: zims[0], lang})
        } else if (zims.length > 1) {
            // find with the latest date
            const item = zims.sort((a, b) => b.date - a.date)[0]
            found.push({zim: item, lang})
        }
    })
    console.log(`Found ${found.length} ZIM archives`)
    if (found.length === 0) {
        throw new Error('No ZIMS found')
    }

    console.log('found', found)
    const urls = found.map(item => ({
        url: `${baseUrl}${item.zim.name}`,
        lang: item.lang
    }))

    while (true) {
        try {
            await fetch(downloaderUrl + 'download', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({urls}),
            })
            break
        } catch (e) {
            console.log('downloader is not available, sleep...')
            // todo move to config
            await sleep(5000)
        }
    }
}

if (!port) {
    throw new Error('WIKI_TRIGGER_PORT is not set')
}

const app = express();
app.use(cors());
app.use(express.json());
app.post('/run', async (req, res) => {
    console.log('Trigger started by web command')
    res.send({result: 'ok'});

    try {
        await run()
    } catch (e) {
        console.log('error', e)
    }
});
app.listen(port, () => console.log(`Started trigger server at http://localhost:${port}`));
