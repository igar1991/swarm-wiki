import React, {useEffect, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import {getPage, onIframeLoaded} from "../utils";
import {Bee} from "@ethersphere/bee-js"
import "./Page.css"

const bee = new Bee(process.env.REACT_APP_BEE_URL);

const getStatusElement = (status) => {
    const container = `
    .container {
    display: flex;
    justify-content: center;
    align-items: center;
}
    `
    if (status === 'loading') {
        return `
<style>
.loader {
  border: 8px solid #f3f3f3; /* Light grey */
  border-top: 8px solid #3498db; /* Blue */
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

${container}
</style>
<div class="container">
<div class="loader"></div>
</div>`
    } else {
        return `
<style>
.error-message{
font-size: 1.5rem;
}
${container}
</style>
<div class="container">
<span class="error-message">${status}</span>
</div>`
    }
}

export default function Page() {
    let {lang, page} = useParams();

    const [pageContent, setPageContent] = useState(null)
    const [status, setStatus] = useState('loading')
    const ref = useRef()

    useEffect(() => {
        async function run() {
            try {
                setPageContent('')
                setStatus('loading')
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
            <iframe ref={ref} srcDoc={pageContent ? pageContent.innerHTML : getStatusElement(status)}
                    onLoad={onIframeLoaded}/>
        </div>
    );
}