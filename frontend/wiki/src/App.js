import {Bee} from "@ethersphere/bee-js"
import parse from 'html-react-parser';
import './App.css';
import React, {useEffect, useState} from "react";
import {Routes, Route, Outlet, Link} from "react-router-dom";
import Page from "./Page/Page";
import Home from "./Home/Home";
import Layout from "./Layout/Layout";
import NotFound from "./NotFound/NotFound";

function App() {
    const [bee, setBee] = useState(null);
    const [content, setContent] = useState('');

    return (
        <Routes>
            <Route path="/" element={<Layout/>}>
                <Route index element={<Home/>}/>
                {/*<Route path="about" element={<About />} />*/}
                <Route path="wiki/:lang/:page" element={<Page/>}/>

                {/* Using path="*"" means "match anything", so this route
                acts like a catch-all for URLs that we don't have explicit
                routes for. */}
                <Route path="*" element={<NotFound/>}/>
            </Route>
        </Routes>
    );
}

export default App;
