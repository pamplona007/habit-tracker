import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@radix-ui/themes/styles.css'
import './index.css'
import { Theme } from '@radix-ui/themes'
import { Providers } from './context'
import { AuthProvider } from './context'
import App from './App.tsx'
import './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <AuthProvider>
        <Theme accentColor="teal" radius="large">
          <App />
        </Theme>
      </AuthProvider>
    </Providers>
  </StrictMode>,
)
