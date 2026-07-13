import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.jsx'

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:20px;color:red;">Error: #root not found</div>';
} else {
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (err) {
    rootEl.innerHTML = '<div style="padding:20px;color:red;"><h2>App Crashed</h2><pre>' + err.message + '</pre><pre>' + err.stack + '</pre></div>';
  }
}

// Global error handler for uncaught errors
window.addEventListener('error', (e) => {
  const el = document.getElementById('root');
  if (el) {
    el.innerHTML += '<div style="padding:10px;color:orange;border:1px solid orange;margin:5px;"><strong>JS Error:</strong> ' + (e.message || e.error?.message || 'unknown') + ' at ' + (e.filename || '') + ':' + (e.lineno || '') + '</div>';
  }
});
