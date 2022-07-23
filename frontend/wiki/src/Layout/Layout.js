import { Outlet, Link } from "react-router-dom";
import './Layout.css';

export default function Layout() {
    return (
        <div>
            <header className="container py-3">
                <div className="d-flex flex-column flex-md-row align-items-center pb-3 mb-4 border-bottom">
                    <Link to="/" className="d-flex align-items-center text-dark text-decoration-none">
                        <img src="/favicon.png" alt="" className="Layout-header-logo"/>
                        <span className="fs-4">Bzz Wiki</span>
                    </Link>

                    <nav className="d-inline-flex mt-2 mt-md-0 ms-md-auto">
                        <Link className="py-2 text-dark text-decoration-none" to="/about">About</Link>
                    </nav>
                </div>
            </header>

            <Outlet />
        </div>
    );
}