import * as d3 from 'd3'
import type { TaxonomySkill, TaxonomyRoot } from '@/types'
import { makeSkillKey } from './taxonomy'

export const CHART_WIDTH = 1000
export const CHART_HEIGHT = 1000
export const CHART_RADIUS = Math.min(CHART_WIDTH, CHART_HEIGHT) / 2 - 80

export function createCirclePolygon(r: number, points = 64): [number, number][] {
  const circlePolygon: [number, number][] = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI
    circlePolygon.push([Math.cos(angle) * r, Math.sin(angle) * r])
  }
  return circlePolygon
}

export function getSubSkillCounts(skill: TaxonomySkill | undefined): { unlocked: number; total: number } {
  const subSkills = Array.isArray(skill?.subSkills) ? skill.subSkills : []
  const total = subSkills.length
  const unlocked = subSkills.reduce((acc, s) => acc + (s && s.unlocked ? 1 : 0), 0)
  return { unlocked, total }
}

export function getUsageValue(skill: TaxonomySkill | { usage?: number } | undefined): number {
  const usage = Number(skill?.usage)
  return Number.isFinite(usage) ? usage : 0
}

export const domainColorSchemes: Record<string, (t: number) => string> = {
  Frontend: d3.interpolateBlues,
  Backend: d3.interpolateGreens,
  DevOps: d3.interpolateOranges,
  Mobile: d3.interpolatePurples,
}

export function getDomainColorScheme(domainName: string): (t: number) => string {
  return domainColorSchemes[domainName] ?? d3.interpolateRainbow
}

export function createUsageScale(values: number[]): (usage: number) => number {
  const numeric = values.filter((v) => Number.isFinite(v))
  const extent = d3.extent(numeric)
  const hasRange =
    extent[0] != null &&
    extent[1] != null &&
    Number.isFinite(extent[0]) &&
    Number.isFinite(extent[1]) &&
    extent[0] !== extent[1]
  return hasRange
    ? d3.scaleLinear().domain([extent[0]!, extent[1]!]).range([0.15, 0.95]).clamp(true)
    : () => 0.6
}

export function getViewKey(data: TaxonomyRoot | { name?: string } | null): string {
  const rootName = 'Tech Skills'
  if (!data || !data.name) return 'overview'
  return data.name === rootName ? 'overview' : `domain::${data.name}`
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return function () {
    t += 0x6d2b79f5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

export type SelectionMetrics = {
  selectedCount: number
  unlockedPeopleCount: number
  unlockedPeopleRatio: number
  usageAvg: number
  unlockedSum: number
}

export function getSelectionMetricsForSkillKey(
  skillKey: string,
  selectionAggBySkillKey: Map<string, { usageSum: number; unlockedSum: number; unlockedPeopleCount: number }>,
  selectedCount: number
): SelectionMetrics {
  const agg = selectionAggBySkillKey.get(skillKey) ?? {
    usageSum: 0,
    unlockedSum: 0,
    unlockedPeopleCount: 0,
  }
  if (selectedCount === 0) {
    return {
      selectedCount: 0,
      unlockedPeopleCount: 0,
      unlockedPeopleRatio: 0,
      usageAvg: 0,
      unlockedSum: 0,
    }
  }
  return {
    selectedCount,
    unlockedPeopleCount: agg.unlockedPeopleCount,
    unlockedPeopleRatio: agg.unlockedPeopleCount / selectedCount,
    usageAvg: agg.usageSum / selectedCount,
    unlockedSum: agg.unlockedSum,
  }
}

export function annotateTaxonomy(taxonomy: TaxonomyRoot): Map<string, { domainName: string; skillName: string; subSkillNames: Set<string> }> {
  const skillKeyToMeta = new Map<string, { domainName: string; skillName: string; subSkillNames: Set<string> }>()
  const domains = taxonomy.children ?? []
  domains.forEach((domain) => {
    const domainName = domain?.name ?? ''
    const skills = domain?.children ?? []
    skills.forEach((skill) => {
      if (!skill?.name || !domainName) return
      const skillKey = makeSkillKey(domainName, skill.name)
      ;(skill as TaxonomySkill).__domain = domainName
      ;(skill as TaxonomySkill).__skillKey = skillKey
      const subSkillNames = new Set(
        (Array.isArray(skill.subSkills) ? skill.subSkills : [])
          .map((s) => s?.name)
          .filter(Boolean) as string[]
      )
      skillKeyToMeta.set(skillKey, { domainName, skillName: skill.name, subSkillNames })
    })
  })
  return skillKeyToMeta
}
