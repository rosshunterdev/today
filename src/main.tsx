import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// Latin only: the app is English, and every font file is precached for offline use.
import '@fontsource/shantell-sans/latin-400.css';
import '@fontsource/shantell-sans/latin-600.css';
import './styles.css';
import { App } from './App';
import { requestPersistentStorage } from './store/persist';
import { checkForUpdates } from './pwa/checkForUpdates';

void requestPersistentStorage();

// Once a new version takes over, the page reloads itself into it (registerType: 'autoUpdate').
// Nothing is lost: every keystroke is already saved.
registerSW({
  immediate: true,
  onRegisteredSW: (_url, registration) => {
    if (registration) checkForUpdates(registration);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
