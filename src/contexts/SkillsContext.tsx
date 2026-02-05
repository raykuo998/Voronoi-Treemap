import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Person, PersonSkillMetrics, SkillKeyMeta } from '@/types'
import {
  buildTaxonomyFromPeople,
  cloneTaxonomy,
  makeSkillKey,
} from '@/lib/taxonomy'
import type { TaxonomySkill } from '@/types'
import { annotateTaxonomy, createUsageScale } from '@/lib/chart-utils'
import type { TaxonomyDomain, TaxonomyRoot } from '@/types'

type SelectionAgg = {
  usageSum: number
  unlockedSum: number
  unlockedPeopleCount: number
}

type SkillsContextValue = {
  people: Person[]
  setPeople: (p: Person[]) => void
  taxonomyData: TaxonomyRoot | null
  skillKeyToMeta: Map<string, SkillKeyMeta>
  personIdToSkillMetrics: Map<string, PersonSkillMetrics>
  selectionAggBySkillKey: Map<string, SelectionAgg>
  selectionAggSelectedCount: number
  usageTGlobal: (usage: number) => number
  selectedPersonIds: Set<string>
  setSelectedPersonIds: (set: Set<string>) => void
  togglePersonSelected: (id: string) => void
  selectAllPeople: () => void
  clearAllPeople: () => void
  hiddenSkillKeys: Set<string>
  setHiddenSkillKeys: (set: Set<string>) => void
  toggleSkillVisibility: (skillKey: string) => void
  hiddenPersonIds: Set<string>
  setHiddenPersonIds: (set: Set<string>) => void
  togglePersonVisibility: (personId: string) => void
  highlightedSkillKeys: Set<string>
  setHighlightedSkillKeys: (set: Set<string>) => void
  pinnedHighlightPersonId: string | null
  setPinnedHighlightPersonId: (id: string | null) => void
  effectiveHighlightedSkillKeys: Set<string>
  chartViewData: TaxonomyRoot | TaxonomyDomain | null
  chartViewHistory: (TaxonomyRoot | TaxonomyDomain)[]
  chartViewSkillKeys: Set<string> | null
  drillDownToDomain: (domain: TaxonomyDomain) => void
  chartGoBack: () => void
  chartResetToOverview: () => void
  isChartOverview: boolean
}

const SkillsContext = createContext<SkillsContextValue | null>(null)

function buildPersonIdToSkillMetrics(
  people: Person[],
  skillKeyToMeta: Map<string, SkillKeyMeta>
): Map<string, PersonSkillMetrics> {
  const personIdToSkillMetrics = new Map<string, PersonSkillMetrics>()
  people.forEach((person) => {
    const id = String(person?.id ?? '').trim()
    if (!id) return
    personIdToSkillMetrics.set(id, new Map())
    const skills = Array.isArray(person?.skills) ? person.skills : []
    skills.forEach((rec) => {
      const domainName = String(rec?.domain ?? '').trim()
      const skillName = String(rec?.skill ?? '').trim()
      if (!domainName || !skillName) return
      const skillKey = makeSkillKey(domainName, skillName)
      const usage = Number(rec?.usage)
      const usageValue = Number.isFinite(usage) ? usage : 0
      const unlockedNames = Array.isArray(rec?.unlockedSubSkills) ? rec.unlockedSubSkills : []
      const meta = skillKeyToMeta.get(skillKey)
      const unlockedSubSkills = new Set<string>()
      if (meta?.subSkillNames?.size) {
        unlockedNames.forEach((n) => {
          const name = String(n ?? '').trim()
          if (!name || unlockedSubSkills.has(name)) return
          if (meta.subSkillNames.has(name)) {
            unlockedSubSkills.add(name)
          }
        })
      } else {
        unlockedNames.forEach((n) => {
          const name = String(n ?? '').trim()
          if (name) unlockedSubSkills.add(name)
        })
      }
      const unlockedCount = unlockedSubSkills.size
      personIdToSkillMetrics.get(id)!.set(skillKey, { usage: usageValue, unlockedCount, unlockedSubSkills })
    })
  })
  return personIdToSkillMetrics
}

function computeSelectionAggregates(
  selectedPersonIds: Set<string>,
  personIdToSkillMetrics: Map<string, PersonSkillMetrics>,
  hiddenPersonIds: Set<string>
): { bySkillKey: Map<string, SelectionAgg>; selectedCount: number } {
  const visibleIds = new Set(selectedPersonIds)
  hiddenPersonIds.forEach((id) => visibleIds.delete(id))
  const selectedCount = visibleIds.size
  const bySkillKey = new Map<string, SelectionAgg>()
  visibleIds.forEach((personId) => {
    const perSkill = personIdToSkillMetrics.get(personId)
    if (!perSkill) return
    perSkill.forEach((metric, skillKey) => {
      const usage = Number(metric?.usage) ?? 0
      const unlocked = Number(metric?.unlockedCount) ?? 0
      if (usage === 0 && unlocked === 0) return
      let agg = bySkillKey.get(skillKey)
      if (!agg) {
        agg = { usageSum: 0, unlockedSum: 0, unlockedPeopleCount: 0 }
        bySkillKey.set(skillKey, agg)
      }
      agg.usageSum += usage
      agg.unlockedSum += unlocked
      if (unlocked > 0) agg.unlockedPeopleCount += 1
    })
  })
  return { bySkillKey, selectedCount }
}

export function SkillsProvider({ children }: { children: ReactNode }) {
  const [people, setPeopleState] = useState<Person[]>([])
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set())
  const [hiddenSkillKeys, setHiddenSkillKeys] = useState<Set<string>>(new Set())
  const [hiddenPersonIds, setHiddenPersonIds] = useState<Set<string>>(new Set())
  const [highlightedSkillKeys, setHighlightedSkillKeys] = useState<Set<string>>(new Set())
  const [pinnedHighlightPersonId, setPinnedHighlightPersonId] = useState<string | null>(null)
  const [chartViewData, setChartViewData] = useState<TaxonomyRoot | TaxonomyDomain | null>(null)
  const [chartViewHistory, setChartViewHistory] = useState<(TaxonomyRoot | TaxonomyDomain)[]>([])

  const taxonomyData = useMemo(() => {
    if (!people.length) return null
    const t = buildTaxonomyFromPeople(people)
    const clone = cloneTaxonomy(t)
    annotateTaxonomy(clone)
    return clone
  }, [people])

  const skillKeyToMeta = useMemo(() => {
    if (!taxonomyData) return new Map<string, SkillKeyMeta>()
    const meta = annotateTaxonomy(taxonomyData)
    return new Map(
      Array.from(meta.entries()).map(([k, v]) => [
        k,
        { ...v, subSkillNames: new Set(v.subSkillNames) },
      ])
    )
  }, [taxonomyData])

  const personIdToSkillMetrics = useMemo(() => {
    return buildPersonIdToSkillMetrics(people, skillKeyToMeta)
  }, [people, skillKeyToMeta])

  const { bySkillKey: selectionAggBySkillKey, selectedCount: selectionAggSelectedCount } =
    useMemo(
      () => computeSelectionAggregates(selectedPersonIds, personIdToSkillMetrics, hiddenPersonIds),
      [selectedPersonIds, personIdToSkillMetrics, hiddenPersonIds]
    )

  const usageTGlobal = useMemo(() => {
    const values: number[] = [0]
    personIdToSkillMetrics.forEach((m) => {
      m.forEach(({ usage }) => values.push(usage))
    })
    return createUsageScale(values)
  }, [personIdToSkillMetrics])

  const setPeople = useCallback((p: Person[]) => {
    setPeopleState(p)
    setSelectedPersonIds(new Set(p.map((x) => String(x?.id ?? '').trim()).filter(Boolean)))
  }, [])

  useEffect(() => {
    fetch('/people.json')
      .then((res) => res.json())
      .then((data: { people?: Person[] }) => {
        const list = Array.isArray(data?.people) ? data.people : []
        setPeople(list)
      })
      .catch(() => {})
  }, [setPeople])

  useEffect(() => {
    if (taxonomyData) {
      setChartViewData(taxonomyData)
      setChartViewHistory([])
    } else {
      setChartViewData(null)
      setChartViewHistory([])
    }
  }, [taxonomyData])

  const drillDownToDomain = useCallback((domain: TaxonomyDomain) => {
    setChartViewData((current) => {
      if (current) setChartViewHistory((h) => [...h, current])
      return domain
    })
  }, [])

  const chartGoBack = useCallback(() => {
    setChartViewHistory((h) => {
      if (h.length === 0) return h
      const next = [...h]
      const prev = next.pop()!
      setChartViewData(prev)
      return next
    })
  }, [])

  const chartResetToOverview = useCallback(() => {
    if (taxonomyData) setChartViewData(taxonomyData)
    setChartViewHistory([])
  }, [taxonomyData])

  const isChartOverview = chartViewData === taxonomyData

  const chartViewSkillKeys = useMemo((): Set<string> | null => {
    if (!chartViewData || isChartOverview) return null
    const domain = chartViewData as TaxonomyDomain
    const set = new Set<string>()
    ;(domain.children ?? []).forEach((s: TaxonomySkill) => {
      const key =
        (s as { __skillKey?: string }).__skillKey ?? makeSkillKey(domain.name, s?.name ?? '')
      if (key) set.add(key)
    })
    return set
  }, [chartViewData, isChartOverview])

  const effectiveHighlightedSkillKeys = useMemo((): Set<string> => {
    if (pinnedHighlightPersonId) {
      const m = personIdToSkillMetrics.get(pinnedHighlightPersonId)
      if (m) return new Set(m.keys())
      return new Set()
    }
    return highlightedSkillKeys
  }, [pinnedHighlightPersonId, highlightedSkillKeys, personIdToSkillMetrics])

  const togglePersonSelected = useCallback((id: string) => {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAllPeople = useCallback(() => {
    setSelectedPersonIds(new Set(people.map((p) => String(p?.id ?? '').trim()).filter(Boolean)))
  }, [people])

  const clearAllPeople = useCallback(() => {
    setSelectedPersonIds(new Set())
  }, [])

  const toggleSkillVisibility = useCallback((skillKey: string) => {
    setHiddenSkillKeys((prev) => {
      const next = new Set(prev)
      if (next.has(skillKey)) next.delete(skillKey)
      else next.add(skillKey)
      return next
    })
  }, [])

  const togglePersonVisibility = useCallback((personId: string) => {
    setHiddenPersonIds((prev) => {
      const next = new Set(prev)
      if (next.has(personId)) next.delete(personId)
      else next.add(personId)
      return next
    })
  }, [])

  const value: SkillsContextValue = useMemo(
    () => ({
      people,
      setPeople,
      taxonomyData,
      skillKeyToMeta,
      personIdToSkillMetrics,
      selectionAggBySkillKey,
      selectionAggSelectedCount,
      usageTGlobal,
      selectedPersonIds,
      setSelectedPersonIds,
      togglePersonSelected,
      selectAllPeople,
      clearAllPeople,
      hiddenSkillKeys,
      setHiddenSkillKeys,
      toggleSkillVisibility,
      hiddenPersonIds,
      setHiddenPersonIds,
      togglePersonVisibility,
      highlightedSkillKeys,
      setHighlightedSkillKeys,
      pinnedHighlightPersonId,
      setPinnedHighlightPersonId,
      effectiveHighlightedSkillKeys,
      chartViewData,
      chartViewHistory,
      chartViewSkillKeys,
      drillDownToDomain,
      chartGoBack,
      chartResetToOverview,
      isChartOverview,
    }),
    [
      people,
      setPeople,
      taxonomyData,
      skillKeyToMeta,
      personIdToSkillMetrics,
      selectionAggBySkillKey,
      selectionAggSelectedCount,
      usageTGlobal,
      selectedPersonIds,
      togglePersonSelected,
      selectAllPeople,
      clearAllPeople,
      hiddenSkillKeys,
      toggleSkillVisibility,
      hiddenPersonIds,
      togglePersonVisibility,
      highlightedSkillKeys,
      pinnedHighlightPersonId,
      effectiveHighlightedSkillKeys,
      chartViewData,
      chartViewHistory,
      chartViewSkillKeys,
      drillDownToDomain,
      chartGoBack,
      chartResetToOverview,
      isChartOverview,
    ]
  )

  return <SkillsContext.Provider value={value}>{children}</SkillsContext.Provider>
}

export function useSkillsContext(): SkillsContextValue {
  const ctx = useContext(SkillsContext)
  if (!ctx) throw new Error('useSkillsContext must be used within SkillsProvider')
  return ctx
}
