import {parse} from 'node-html-parser';

export const wikiOwnerAddress = process.env.REACT_APP_WIKI_OWNER_ADDRESS;

/**
 * Downloads wikipedia page content and prepare it for rendering
 */
export async function getPage(bee, lang, pageName) {
    let content = await getContentByKey(bee, `wiki_page_${lang}_${pageName}`);
    const replaceWithUrl = '/wiki_files/en'
    const parsed = parse(content)
    // parsed.innerHTML = parsed.innerHTML.replace('<head>', `<head><script src="/wiki_files/handler.js"></script>`);
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
    const aList = parsed.querySelectorAll('a')
    const iframe = document.querySelector('iframe')
    aList.forEach(a => {
        if (!a.attributes.href) {
            return
        }

        if (a.attributes.href.startsWith('#')){
            return
        }

        if (a.attributes.href.startsWith('http://') || a.attributes.href.startsWith('https://')) {
            a.setAttribute('target', '_blank')
            return
        }

        a.setAttribute('data-url', `/#/wiki/en/${a.attributes.href}`)
        a.setAttribute('href', `javascript:window.parent.location="/#/wiki/en/${a.attributes.href}"`)
    })

    return {parsed,}
}

/**
 * Downloads page by key from feed
 */
export async function getContentByKey(bee, key) {
    const topic = bee.makeFeedTopic(key)
    const feedReader = bee.makeFeedReader('sequence', topic, wikiOwnerAddress)
    const data = await feedReader.download()
    return (await bee.downloadData(data.reference)).text()
}