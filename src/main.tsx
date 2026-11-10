import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
// Latin only: the app is English, and every font file is precached for offline use.
import '@fontsource/shantell-sans/latin-400.css';
import '@fontsource/shantell-sans/latin-600.css';
import './styles.css';
// The FOCUS look, tried on over the journal (prototype). Take these six lines out to get the journal back.
import '@fontsource/spectral/latin-300.css';
import '@fontsource/spectral/latin-400.css';
import '@fontsource/karla/latin-400.css';
import '@fontsource/karla/latin-500.css';
import './focus.css';
import { App } from './App';
import { requestPersistentStorage } from './store/persist';
import { checkForUpdates } from './pwa/checkForUpdates';
import { SyncProvider } from './sync/SyncProvider';
import { supabase } from './sync/client';
import { supabaseAuth } from './sync/auth';
import { supabaseRemote } from './sync/remote';

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
    <SyncProvider auth={supabase ? supabaseAuth(supabase) : null} remote={supabase ? supabaseRemote(supabase) : null}>
      <App />
    </SyncProvider>
  </StrictMode>,
);
