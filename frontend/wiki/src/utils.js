import {parse} from 'node-html-parser';

export const wikiOwnerAddress = process.env.REACT_APP_WIKI_OWNER_ADDRESS;

/**
 * Downloads wikipedia page content and prepare it for rendering
 */
export async function getPage(bee, lang, pageName) {
    let content = await getContentByKey(bee, `wiki_page_${lang}_${pageName}`, pageName);
    if (!content.trim()) {
        throw new Error('Page is not available at this moment');
    }

    const replaceWithUrl = '/wiki_files/en'
    const parsed = parse(content)
    // parsed.innerHTML = parsed.innerHTML.replace('<head>', `<head><script src="/wiki_files/handler.js"></script>`);
    const cssLinks = parsed.querySelectorAll('link')
    const scripts = parsed.querySelectorAll('script')
    // because swarm can't handle so long urls during upload
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
    aList.forEach(a => {
        if (!a.attributes.href) {
            return
        }

        if (a.attributes.href.startsWith('#')) {
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
export async function getContentByKey(bee, key, pageName) {
    const topic = bee.makeFeedTopic(key)
    const feedReader = bee.makeFeedReader('sequence', topic, wikiOwnerAddress)
    const data = await (await fetch(process.env.REACT_APP_BEE_URL + `feeds/${wikiOwnerAddress.replace('0x', '')}/${feedReader.topic}?type=sequence&pageName=${decodeURI(pageName)}`)).json()

    if (data.cache) {
        return data.cache
    } else {
        return (await bee.downloadData(data.reference)).text()
    }
}

/**
 * Handles iframe loaded event
 */
export function onIframeLoaded() {
    const iframe = document.querySelector('iframe')
    let aList = []
    aList.push(...iframe.contentWindow.document.body.querySelectorAll('a'))

    aList.forEach(a => {
        if (!a.href) {
            return
        }

        if (!a.hash.startsWith('#/') && !a.classList.contains('external')) {
            a.onclick = (e) => {
                e.preventDefault()
                const name = a.hash
                const element = iframe.contentWindow.document.body.querySelector(name)
                if (element) {
                    element.scrollIntoView()
                } else {
                    console.log('element not found', name)
                }
            }

            return
        }

        if (a.href.startsWith('http://') || a.href.startsWith('https://')) {
            return
        }

        const key = 'javascript:window.parent.location="'
        if (a.href.startsWith(key)) {
            a.setAttribute('href', a.dataset.url)
        }

        a.onclick = (e) => {
            e.preventDefault()
            window.parent.location = a.href;
        }
    })
}

export function getRedirectPage(parsed) {
    const content = parsed?.innerHTML
    const redirectKey = 'redirect:'
    const redirectKey2 = `<meta http-equiv="refresh" content="0;url=`

    let redirectPage = ''
    if (content?.startsWith(redirectKey)) {
        redirectPage = content.substring(redirectKey.length)
    } else if (content?.includes(redirectKey2)) {
        redirectPage = parsed.querySelector('meta[http-equiv="refresh"]').attributes.content.split('url=')[1]
    }

    return redirectPage
}
