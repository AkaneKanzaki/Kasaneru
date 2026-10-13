import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'

// Tandai platform native untuk penyesuaian CSS
// (mis. system navigation bar Android yang edge-to-edge).
if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('native', `native-${Capacitor.getPlatform()}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
