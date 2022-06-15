import fetch from 'node-fetch';

const baseUrl = process.env.WIKI_BASE
let zimsCheck = process.env.WIKI_ZIMS_CHECK
console.log(`WIKI_BASE`, baseUrl)
console.log(`WIKI_ZIMS_CHECK`, zimsCheck)
if (!baseUrl) {
    throw new Error('WIKI_BASE is not set')
}

if (!zimsCheck) {
    throw new Error('WIKI_ZIMS_CHECK is not set')
}

zimsCheck = zimsCheck.split(',').map(item => item.trim())

if (zimsCheck.length === 0) {
    throw new Error('WIKI_ZIMS_CHECK is empty')
}

/**
 * Fins all passed ZIM archives in the wiki
 */
async function run() {
    const html = await (await fetch(baseUrl)).text()
    const lines = html.split('\n').filter(item => item.startsWith('<a href="'))
    const urlsInfo = lines.map(line => {
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

    console.log(`Total ${urlsInfo.length} ZIM archives`)
    let found = []
    zimsCheck.forEach(zimSearch => {
        const zims = urlsInfo.filter(item => item.name.startsWith(zimSearch))
        if (zims.length === 1) {
            found.push(zims[0])
        } else if (zims.length > 1) {
            // find with the latest date
            const item = zims.sort((a, b) => b.date - a.date)[0]
            found.push(item)
        }
    })
    console.log(`Found ${found.length} ZIM archives`)
    if (found.length === 0) {
        throw new Error('No ZIMS found')
    }
}

// todo implement infinite loop? or it should be implemented in docker? docker-composer auto-restart-delay or smth like that
run().then()
