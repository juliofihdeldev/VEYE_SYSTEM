import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from './components/auth/Login.tsx';
import Viktim from './components/Viktim.tsx';
import DangerZone from './components/DangerZone.tsx';
import Kidnapping from './components/Kidnapping.tsx';
import News from './components/News.tsx';
import Maps from './components/Maps.tsx';
const router = createBrowserRouter([
    {
        path: "/",
        element: _jsx(Login, {}),
    },
    {
        path: "home",
        element: _jsxs(App, { children: [" ", _jsx(Viktim, {}), " "] }),
    },
    {
        path: "viktim",
        element: _jsxs(App, { children: [" ", _jsx(Viktim, {}), " "] }),
    },
    {
        path: "news",
        element: _jsxs(App, { children: [" ", _jsx(News, {}), " "] }),
    },
    {
        path: "zone-danger",
        element: _jsxs(App, { children: [" ", _jsx(DangerZone, {}), " "] }),
    },
    {
        path: "maps",
        element: _jsxs(App, { children: [" ", _jsx(Maps, {}), " "] }),
    },
    {
        path: "kidnapping",
        element: _jsxs(App, { children: [" ", _jsx(Kidnapping, {}), " "] }),
    },
]);
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(RouterProvider, { router: router }) }));
