import {parse} from 'node-html-parser';

export const wikiOwnerAddress = process.env.REACT_APP_WIKI_OWNER_ADDRESS;

export async function getPage(bee, lang, pageName) {
    let content = await getContentByKey(bee, `wiki_page_${lang}_${pageName}`);

    const parsed = parse(content)
    parsed.innerHTML = parsed.innerHTML.replace('<head>', `<head><script src="/wiki_files/handler.js"></script>`);
    const cssLinks = parsed.querySelectorAll('link')
    const scripts = parsed.querySelectorAll('script')
    const imgs = parsed.querySelectorAll('img')
    cssLinks.map(item => item.setAttribute('href', item.attributes.href.replace('..', '/wiki_files')))
    scripts.map(item => {
        if (item.attributes.src) {
            item.setAttribute('src', item.attributes.src.replace('..', '/wiki_files'))
        }
    })

    return {parsed, imgs: imgs.map(item => item.attributes.src)}
}

export async function getImageReference(bee, lang, src) {
    src = decodeURI(src)
    src = src.replace('../I/', '')
    const key = `wiki_image_${lang}_${src}`
    console.log(src, key)
    const topic = bee.makeFeedTopic(key)
    const feedReader = bee.makeFeedReader('sequence', topic, wikiOwnerAddress)

    return (await feedReader.download()).reference
}

export async function getContentByKey(bee, key) {
    const topic = bee.makeFeedTopic(key)
    const feedReader = bee.makeFeedReader('sequence', topic, wikiOwnerAddress)
    const data = await feedReader.download()
    return (await bee.downloadData(data.reference)).text()
}