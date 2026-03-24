import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@radix-ui/themes/styles.css'
import './index.css'
import { Theme } from '@radix-ui/themes'
import App from './App.tsx'
import './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme accentColor="orange" radius="medium">
      <App />
    </Theme>
  </StrictMode>,
)
