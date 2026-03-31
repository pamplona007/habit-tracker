import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from './context/Providers';
import { UpdatePrompt } from './components/UpdatePrompt';
import { InstallPrompt } from './components/InstallPrompt';
import { useFirstVisitNotification } from './hooks/useFirstVisitNotification';
import App from './App';
import './index.scss';

function NotificationPrompt() {
  useFirstVisitNotification();
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <App />
      <UpdatePrompt />
      <InstallPrompt />
      <NotificationPrompt />
    </Providers>
  </StrictMode>
);
