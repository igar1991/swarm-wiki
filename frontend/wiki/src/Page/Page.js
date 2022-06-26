import React, {useEffect, useRef, useState} from "react";
import {useParams} from "react-router-dom";
import {getImageReference, getPage} from "../utils";
import {Bee} from "@ethersphere/bee-js"

const bee = new Bee(process.env.REACT_APP_BEE_URL);

export default function Page() {
    let {lang, page} = useParams();

    const [pageContent, setPageContent] = useState(null)
    const ref = useRef()


    useEffect(() => {
        async function run() {
            const {parsed, imgs} = await getPage(bee, lang, page)
            console.log('imgs', imgs)
            setPageContent(parsed)
            for (const img of imgs) {
                try {
                    const imageReference = await getImageReference(bee, lang, img)
                    console.log(img, imageReference)
                    try {
                        // todo replace with real bee node url (.env)
                        ref.current.contentWindow.postMessage({
                            action: 'setSrc',
                            oldSrc: img,
                            newSrc: `${process.env.REACT_APP_BEE_URL}/bytes/` + imageReference
                        }, '*')
                    } catch (e) {
                        console.log('error on postMessage', e)
                    }
                    // todo postmessage to iframe with full src and the content to replace (bin or base64)?
                } catch (e) {
                    console.log('reference not found', img)
                }
            }
        }

        if (page) {
            run().then()
        }
    }, [page])

    return (
        <div className="Page">
            {/*<button onClick={() => {*/}
            {/*    ref.current.contentWindow.postMessage({'helllo':'world'}, '*')*/}
            {/*    // window.postMessage('helllo', '*')*/}
            {/*}}>*/}
            {/*    click*/}
            {/*</button>*/}


            {/*{pageContent && <div dangerouslySetInnerHTML={{__html: pageContent}}/>}*/}
            {/*<IFrame src={pageContent?pageContent.innerHTML:'loading...'}>*/}
            {/*    {pageContent && <div dangerouslySetInnerHTML={{__html: pageContent}}/>}*/}
            {/*</IFrame>*/}
            <iframe ref={ref} srcDoc={pageContent ? pageContent.innerHTML : 'loading...'} frameBorder={0} width='100%'
                    height='600px'/>
        </div>
    );
}