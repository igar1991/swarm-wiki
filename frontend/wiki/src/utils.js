import {parse} from 'node-html-parser';

export const wikiOwnerAddress = process.env.REACT_APP_WIKI_OWNER_ADDRESS;

export async function getPage(bee, lang, pageName) {
    let content = await getContentByKey(bee, `wiki_page_${lang}_${pageName}`);

    const replaceWithUrl = '/wiki_files/en'
    const parsed = parse(content)
    parsed.innerHTML = parsed.innerHTML.replace('<head>', `<head><script src="/wiki_files/handler.js"></script>`);
    const cssLinks = parsed.querySelectorAll('link')
    const scripts = parsed.querySelectorAll('script')
    const longName = 'skins.minerva.base.reset|skins.minerva.content.styles|ext.cite.style|site.styles|mobile.app.pagestyles.android|mediawiki.page.gallery.styles|mediawiki.skinning.content.parsoid.css'
    const shortName = 'pack.css'
    cssLinks.forEach(item => {
        item.setAttribute('href', item.attributes.href.replace('..', replaceWithUrl).replace(longName, shortName))
    })
    scripts.forEach(item => {
        if (item.attributes.src) {
            item.setAttribute('src', item.attributes.src.replace('..', replaceWithUrl))
        }
    })

    return {parsed,}
}

// export async function getImageReference(bee, lang, src) {
//     src = decodeURI(src)
//     src = src.replace('../I/', '')
//     const key = `wiki_image_${lang}_${src}`
//     const topic = bee.makeFeedTopic(key)
//     const feedReader = bee.makeFeedReader('sequence', topic, wikiOwnerAddress)
//
//     return (await feedReader.download()).reference
// }

export async function getContentByKey(bee, key) {
    const topic = bee.makeFeedTopic(key)
    const feedReader = bee.makeFeedReader('sequence', topic, wikiOwnerAddress)
    const data = await feedReader.download()
    return (await bee.downloadData(data.reference)).text()
}