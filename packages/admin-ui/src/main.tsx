import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import './globals.css';

createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <BrowserRouter basename="/admin">
            <App />
        </BrowserRouter>
    </StrictMode>,
);
