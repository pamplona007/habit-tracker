import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Providers } from './context/Providers';
import { UpdatePrompt } from './components/UpdatePrompt';
import App from './App';
import './index.scss';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <App />
      <UpdatePrompt />
    </Providers>
  </StrictMode>
);
