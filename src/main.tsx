import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ResumeProvider, UIProvider, SettingsProvider } from './contexts'

// Initialize Telegram Mini App
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        disableVerticalSwipes: () => void;
        isExpanded: boolean;
        platform: string;
        colorScheme: string;
        themeParams: Record<string, string>;
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
        };
      };
    };
  }
}

if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();
  // Prevent accidental close when scrolling
  try { tg.disableVerticalSwipes(); } catch (_) { /* older SDK versions */ }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <UIProvider>
        <ResumeProvider>
          <App />
        </ResumeProvider>
      </UIProvider>
    </SettingsProvider>
  </StrictMode>,
)

