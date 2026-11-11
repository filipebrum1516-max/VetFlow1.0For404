import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { applyFavicon } from './favicon'
import { BootBoundary, installBootRecovery } from './boot'

installBootRecovery()
applyFavicon()
document.documentElement.lang = 'pt-BR'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BootBoundary>
      <App />
    </BootBoundary>
  </React.StrictMode>,
)
