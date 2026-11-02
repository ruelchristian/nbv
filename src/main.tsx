import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatically check for service worker updates so users don't get stuck with stale cached bundles
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.update().catch(() => {});
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(<App />);
