import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { applyAccessibility, applyTheme } from './lib/themes.js';
import { loadState } from './lib/store.js';

// Paint the saved theme before React mounts so there is no flash of the
// default palette on load.
try {
  const saved = loadState().settings;
  applyTheme(saved.theme);
  applyAccessibility(saved);
} catch {
  applyTheme('dark');
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
