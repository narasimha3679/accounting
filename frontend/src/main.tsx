import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import './index.css'
import App from './App.tsx'
import { initUmami } from './lib/umami'
import { setupInstallPrompt } from './lib/pwa'

// Initialize Umami analytics (only in production with valid config)
initUmami()

// Setup PWA install prompt
setupInstallPrompt()

// Service worker is automatically registered by vite-plugin-pwa
// Push notification subscription is handled in Settings page

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
