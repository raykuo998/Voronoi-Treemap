import type { TaxonomyRoot, Person } from '@/types'

export function makeSkillKey(domainName: string, skillName: string): string {
  return `${domainName}::${skillName}`
}

function cloneObject<T>(obj: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj))
}

function ensureDomainNode(taxonomy: TaxonomyRoot, domainName: string): TaxonomyRoot['children'][0] {
  if (!taxonomy.children) taxonomy.children = []
  const existing = taxonomy.children.find((d) => d?.name === domainName)
  if (existing) return existing
  const domainNode = { name: domainName, children: [] }
  taxonomy.children.push(domainNode)
  return domainNode
}

function ensureSkillNode(
  domainNode: TaxonomyRoot['children'][0],
  skillName: string
): { name: string; usage: number; subSkills: { name: string; unlocked: boolean }[] } {
  if (!domainNode.children) domainNode.children = []
  const existing = domainNode.children.find((s) => s?.name === skillName)
  if (existing) return existing as { name: string; usage: number; subSkills: { name: string; unlocked: boolean }[] }
  const skillNode = { name: skillName, usage: 0, subSkills: [] }
  domainNode.children.push(skillNode)
  return skillNode
}

function ensureSubSkillNames(
  skillNode: { subSkills?: { name: string; unlocked: boolean }[] },
  names: string[]
): void {
  if (!skillNode.subSkills) skillNode.subSkills = []
  const existing = new Set(skillNode.subSkills.map((s) => s?.name).filter(Boolean))
  names.forEach((name) => {
    if (!name || existing.has(name)) return
    skillNode.subSkills!.push({ name, unlocked: false })
    existing.add(name)
  })
}

export function createEmptyTaxonomy(): TaxonomyRoot {
  return { name: 'Tech Skills', children: [] }
}

export function applyPeopleUnionToTaxonomy(taxonomy: TaxonomyRoot, people: Person[]): void {
  const persons = Array.isArray(people) ? people : []
  persons.forEach((person) => {
    const skills = Array.isArray(person?.skills) ? person.skills : []
    skills.forEach((rec) => {
      const domainName = String(rec?.domain ?? '').trim()
      const skillName = String(rec?.skill ?? '').trim()
      if (!domainName || !skillName) return
      const domainNode = ensureDomainNode(taxonomy, domainName)
      const skillNode = ensureSkillNode(domainNode, skillName)
      ensureSubSkillNames(skillNode, rec?.unlockedSubSkills ?? [])
    })
  })
}

export function buildTaxonomyFromPeople(people: Person[]): TaxonomyRoot {
  const taxonomy = createEmptyTaxonomy()
  applyPeopleUnionToTaxonomy(taxonomy, people)
  return taxonomy
}

export function cloneTaxonomy(taxonomy: TaxonomyRoot): TaxonomyRoot {
  return cloneObject(taxonomy)
}
