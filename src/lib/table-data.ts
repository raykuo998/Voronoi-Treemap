import type { SkillTableRow, PersonTableRow } from '@/types'
import { useSkillsContext } from '@/contexts/SkillsContext'
import { useMemo } from 'react'

export function useSkillTableData(): SkillTableRow[] {
  const {
    people,
    selectedPersonIds,
    selectionAggBySkillKey,
    selectionAggSelectedCount,
    skillKeyToMeta,
    personIdToSkillMetrics,
    hiddenSkillKeys,
  } = useSkillsContext()

  return useMemo(() => {
    const rows: SkillTableRow[] = []
    const selected = Array.from(selectedPersonIds)
    if (selected.length === 0) return rows

    selectionAggBySkillKey.forEach((agg, skillKey) => {
      const meta = skillKeyToMeta.get(skillKey)
      if (!meta) return
      const totalUsage = agg.usageSum
      const contributorCount = agg.unlockedPeopleCount
      const avgUsage = selectionAggSelectedCount > 0 ? totalUsage / selectionAggSelectedCount : 0
      const contributors: SkillTableRow['contributors'] = []
      selected.forEach((personId) => {
        const perSkill = personIdToSkillMetrics.get(personId)
        const metric = perSkill?.get(skillKey)
        const usage = Number(metric?.usage) ?? 0
        if (usage === 0) return
        const person = people.find((p) => String(p?.id ?? '').trim() === personId)
        const personName = person?.name ?? personId
        const percentage = totalUsage > 0 ? (usage / totalUsage) * 100 : 0
        contributors.push({ personId, personName, usage, percentage })
      })
      contributors.sort((a, b) => b.usage - a.usage)
      rows.push({
        skillKey,
        skillName: meta.skillName,
        domainName: meta.domainName,
        totalUsage,
        avgUsage,
        contributorCount,
        isVisible: !hiddenSkillKeys.has(skillKey),
        contributors,
      })
    })

    rows.sort((a, b) => b.totalUsage - a.totalUsage)
    return rows
  }, [
    people,
    selectedPersonIds,
    selectionAggBySkillKey,
    selectionAggSelectedCount,
    skillKeyToMeta,
    personIdToSkillMetrics,
    hiddenSkillKeys,
  ])
}

export function usePersonTableData(): PersonTableRow[] {
  const {
    people,
    selectedPersonIds,
    personIdToSkillMetrics,
    selectionAggBySkillKey,
    selectionAggSelectedCount,
    hiddenPersonIds,
  } = useSkillsContext()

  return useMemo(() => {
    const rows: PersonTableRow[] = []
    let totalChartUsage = 0
    selectedPersonIds.forEach((personId) => {
      const perSkill = personIdToSkillMetrics.get(personId)
      if (!perSkill) return
      perSkill.forEach((m) => {
        totalChartUsage += Number(m?.usage) ?? 0
      })
    })

    selectedPersonIds.forEach((personId) => {
      const person = people.find((p) => String(p?.id ?? '').trim() === personId)
      const personName = person?.name ?? personId
      const perSkill = personIdToSkillMetrics.get(personId)
      if (!perSkill) return

      let totalUsage = 0
      const skills: PersonTableRow['skills'] = []
      const domainSums: Record<string, number> = {}

      perSkill.forEach((metric, skillKey) => {
        const usage = Number(metric?.usage) ?? 0
        if (usage === 0) return
        totalUsage += usage
        const [domain, skillName] = skillKey.includes('::') ? skillKey.split('::') : ['', skillKey]
        if (domain) domainSums[domain] = (domainSums[domain] ?? 0) + usage
        skills.push({ skillKey, skillName, domain, usage })
      })

      skills.sort((a, b) => b.usage - a.usage)
      const chartPercentage = totalChartUsage > 0 ? (totalUsage / totalChartUsage) * 100 : 0
      const domainBreakdown: Record<string, number> = {}
      if (totalUsage > 0) {
        Object.entries(domainSums).forEach(([d, sum]) => {
          domainBreakdown[d] = Math.round((sum / totalUsage) * 100)
        })
      }

      rows.push({
        personId,
        personName,
        totalUsage,
        chartPercentage,
        skillCount: skills.length,
        isVisible: !hiddenPersonIds.has(personId),
        domainBreakdown,
        skills,
      })
    })

    rows.sort((a, b) => b.totalUsage - a.totalUsage)
    return rows
  }, [
    people,
    selectedPersonIds,
    personIdToSkillMetrics,
    selectionAggBySkillKey,
    selectionAggSelectedCount,
    hiddenPersonIds,
  ])
}
