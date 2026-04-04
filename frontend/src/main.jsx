import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'
import './i18n'
import { registerSW } from 'virtual:pwa-register'

// SW 업데이트 감지 시 "새 버전" 배너 표시
const updateSW = registerSW({
  onNeedRefresh() {
    // 배너 생성
    const banner = document.createElement('div')
    banner.id = 'pwa-update-banner'
    banner.innerHTML = `
      <span>새 버전이 있습니다</span>
      <button id="pwa-update-btn">새로고침</button>
      <button id="pwa-dismiss-btn">&times;</button>
    `
    Object.assign(banner.style, {
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      background: '#1a1a2e', color: '#fff', padding: '12px 20px', borderRadius: '12px',
      display: 'flex', alignItems: 'center', gap: '12px', zIndex: '99999',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)', fontSize: '14px', fontFamily: 'sans-serif'
    })
    document.body.appendChild(banner)

    // 새로고침 버튼
    const updateBtn = document.getElementById('pwa-update-btn')
    Object.assign(updateBtn.style, {
      background: '#4361ee', color: '#fff', border: 'none', padding: '6px 16px',
      borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'
    })
    updateBtn.addEventListener('click', () => updateSW(true))

    // 닫기 버튼
    const dismissBtn = document.getElementById('pwa-dismiss-btn')
    Object.assign(dismissBtn.style, {
      background: 'none', color: '#888', border: 'none', cursor: 'pointer',
      fontSize: '18px', padding: '0 4px'
    })
    dismissBtn.addEventListener('click', () => banner.remove())
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
