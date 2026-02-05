export interface SubSkill {
  name: string
  unlocked?: boolean
}

export interface TaxonomySkill {
  name: string
  usage?: number
  subSkills?: SubSkill[]
  __domain?: string
  __skillKey?: string
}

export interface TaxonomyDomain {
  name: string
  children: TaxonomySkill[]
}

export interface TaxonomyRoot {
  name: string
  children: TaxonomyDomain[]
}

export interface PersonSkill {
  domain: string
  skill: string
  usage: number
  unlockedSubSkills: string[]
}

export interface Person {
  id: string
  name: string
  skills: PersonSkill[]
}

export interface SkillTableRow {
  skillKey: string
  skillName: string
  domainName: string
  totalUsage: number
  avgUsage: number
  contributorCount: number
  isVisible: boolean
  contributors: {
    personId: string
    personName: string
    usage: number
    percentage: number
  }[]
}

export interface PersonTableRow {
  personId: string
  personName: string
  totalUsage: number
  chartPercentage: number
  skillCount: number
  isVisible: boolean
  domainBreakdown: Record<string, number>
  skills: {
    skillKey: string
    skillName: string
    domain: string
    usage: number
    unlockedCount: number
    totalSubSkills: number
  }[]
}

export type SkillKeyMeta = {
  domainName: string
  skillName: string
  subSkillNames: Set<string>
}

export type PersonSkillMetrics = Map<string, { usage: number; unlockedCount: number }>
