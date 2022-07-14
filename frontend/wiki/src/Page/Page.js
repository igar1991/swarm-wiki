import React, {useEffect, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import {getPage} from "../utils";
import {Bee} from "@ethersphere/bee-js"
import "./Page.css"

const bee = new Bee(process.env.REACT_APP_BEE_URL);

export default function Page() {
    let {lang, page} = useParams();

    const [pageContent, setPageContent] = useState(null)
    const [status, setStatus] = useState('Loading...')
    const ref = useRef()

    useEffect(() => {
        async function run() {
            try {
                setPageContent('')
                setStatus('Loading...')
                const {parsed} = await getPage(bee, lang, page)
                const redirectKey = 'redirect:'
                const content = parsed?.innerHTML
                if (content?.startsWith(redirectKey)) {
                    const redirectPage = content.substring(redirectKey.length)
                    if (!redirectPage) {
                        alert('Received empty redirect page. Try to visit other page or contact admin')
                        return
                    }

                    window.location.href = `#/wiki/${lang}/${redirectPage}`
                    return
                }

                setPageContent(parsed)
            } catch (e) {
                let message = e.message ? e.message : ''
                if (message.includes('lookup failed')) {
                    message = 'page not found'
                } else if (message.includes('Not Found')) {
                    message = 'page not found'
                }

                setStatus(`Can not get the page. Error: ${message}`)
            }
        }

        if (page) {
            run().then()
        }
    }, [page])

    return (
        <div className="Page">
            <iframe ref={ref} srcDoc={pageContent ? pageContent.innerHTML : status} onLoad={() => {
                const iframes = document.querySelectorAll('iframe')
                let aList = []
                iframes.forEach(item => aList.push(...item.contentWindow.document.body.querySelectorAll('a')))

                aList.forEach(a => {
                    a.setAttribute('href', `/#/wiki/en${a.pathname}`)
                    a.onclick = (e) => {
                        e.preventDefault()
                        window.parent.location = a.href;
                    }
                })
            }}/>
        </div>
    );
}