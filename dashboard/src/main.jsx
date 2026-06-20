import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

import { AuthProvider } from './contexts/AuthContext'
import { MeshProvider } from './contexts/MeshContext'
import { LanguageProvider } from './contexts/LanguageContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MeshProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </MeshProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
