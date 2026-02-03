'use client'

import { SkillsProvider } from '@/contexts/SkillsContext'
import App from '@/App'

export default function Home() {
  return (
    <SkillsProvider>
      <App />
    </SkillsProvider>
  )
}
