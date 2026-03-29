import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'
import './i18n'
import { registerSW } from 'virtual:pwa-register'

// Auto-reload when a new service worker version is deployed
registerSW({
  onNeedRefresh() {
    window.location.reload();
  },
  onOfflineReady() {},
});

// Global Axios configuration for API routing
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';
axios.defaults.withCredentials = true; // Enable cookies in requests

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
