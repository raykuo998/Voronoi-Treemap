import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SkillsProvider } from '@/contexts/SkillsContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SkillsProvider>
      <App />
    </SkillsProvider>
  </StrictMode>,
)
