
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (!window.storage) {
  window.storage = {
    async get(key) { return { value: localStorage.getItem(key) }; },
    async set(key, value) { localStorage.setItem(key, value); },
    async delete(key) { localStorage.removeItem(key); }
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
