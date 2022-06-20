import {Bee} from "@ethersphere/bee-js"
import parse from 'html-react-parser';
import './App.css';
import {useEffect, useState} from "react";
import { Routes, Route, Outlet, Link } from "react-router-dom";
import Page from "./Page/Page";
import Home from "./Home/Home";
import Layout from "./Layout/Layout";
import NotFound from "./NotFound/NotFound";

function App() {
    const [bee, setBee] = useState(null);
    const [content, setContent] = useState('');

    async function downloadPage(key) {
        const topic = bee.makeFeedTopic('wiki_page_' + key)
        const feedReader = bee.makeFeedReader('sequence', topic, '0xfBfCa6582d64964D746a166c466d392053b178b3')
        const data = await feedReader.download()
        console.log('data', data)
        const content = (await bee.downloadData(data.reference)).text()
        console.log('content', content)

        return content
    }

    // useEffect(() => {
    //     const bee = new Bee('http://localhost:1633');
    //     setBee(bee)
    //
    // }, [])
    //
    // useEffect(() => {
    //     if (!bee){
    //         return
    //     }
    //
    //     downloadPage('Atimw').then(data => setContent(data))
    //
    // }, [bee])

    // return (
    //     <div className="App">
    //         <p>Hello World</p>
    //         <p>{parse(content)}</p>
    //     </div>
    // );

    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                {/*<Route path="about" element={<About />} />*/}
                <Route path="wiki/:page" element={<Page />} />

                {/* Using path="*"" means "match anything", so this route
                acts like a catch-all for URLs that we don't have explicit
                routes for. */}
                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>
    );
}

export default App;
