import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import './styles.css';
import { App } from './App';
import { requestPersistentStorage } from './store/persist';

void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
