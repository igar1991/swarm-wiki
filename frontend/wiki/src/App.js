import './App.css';
import React from "react";
import {Routes, Route} from "react-router-dom";
import Page from "./Page/Page";
import Home from "./Home/Home";
import Layout from "./Layout/Layout";
import NotFound from "./NotFound/NotFound";
import About from "./About/About";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Layout/>}>
                <Route index element={<Home/>}/>
                <Route path="about" element={<About />} />
                <Route path="wiki/:lang/:page" element={<Page/>}/>
                <Route path="*" element={<NotFound/>}/>
            </Route>
        </Routes>
    );
}

export default App;
