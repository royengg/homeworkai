import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// `agentation` is a dev-only inspection overlay. Importing it statically would
// pull it into the production bundle; a dynamic import guarded by DEV keeps it
// out of the shipped bundle entirely.
if (import.meta.env.DEV) {
  void import('agentation').then(({ Agentation }) => {
    const root = document.getElementById('root');
    if (root) {
      const mount = document.createElement('div');
      mount.id = 'agentation-mount';
      root.appendChild(mount);
      // Defer mounting to avoid running before React has hydrated; this is a
      // best-effort dev tool and never blocks the user-facing app.
      setTimeout(() => {
        ReactDOM.createRoot(mount).render(
          <React.StrictMode>
            <Agentation />
          </React.StrictMode>,
        );
      }, 0);
    }
  }).catch(() => void 0);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);