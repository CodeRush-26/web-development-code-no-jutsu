import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// StrictMode disabled: Leaflet has imperative side effects that don't tolerate
// double-mounting in dev mode. Production builds don't run StrictMode anyway.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
