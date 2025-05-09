import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ConfigProvider } from "antd";
import "./index.css"
import ruRU from "antd/lib/locale/ru_RU";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ConfigProvider locale={ruRU}>
            <App />
    </ConfigProvider>
);