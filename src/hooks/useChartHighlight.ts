import { useCallback } from 'react'
import { useSkillsContext } from '@/contexts/SkillsContext'

export function useChartHighlight() {
  const { setHighlightedSkillKeys } = useSkillsContext()

  const highlightBySkillKey = useCallback(
    (skillKey: string | null) => {
      setHighlightedSkillKeys(skillKey ? new Set([skillKey]) : new Set())
    },
    [setHighlightedSkillKeys]
  )

  const highlightByPersonId = useCallback(
    (personId: string | null, personSkillKeys: string[]) => {
      setHighlightedSkillKeys(personId ? new Set(personSkillKeys) : new Set())
    },
    [setHighlightedSkillKeys]
  )

  const clearHighlight = useCallback(() => {
    setHighlightedSkillKeys(new Set())
  }, [setHighlightedSkillKeys])

  return { highlightBySkillKey, highlightByPersonId, clearHighlight }
}
