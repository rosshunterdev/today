import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Latin only: the app is English, and every font file is precached for offline use.
import '@fontsource/shantell-sans/latin-400.css';
import '@fontsource/shantell-sans/latin-600.css';
import './styles.css';
import { App } from './App';
import { requestPersistentStorage } from './store/persist';

void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
