import { useEffect } from 'react'
import { useSkillsContext } from '@/contexts/SkillsContext'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import type { Person } from '@/types'

export function PeoplePanel() {
  const {
    people,
    setPeople,
    selectedPersonIds,
    togglePersonSelected,
    selectAllPeople,
    clearAllPeople,
  } = useSkillsContext()

  useEffect(() => {
    let cancelled = false
    fetch('/people.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
      .then((data: { people?: Person[] }) => {
        if (cancelled) return
        const list = Array.isArray(data?.people) ? data.people : []
        setPeople(list)
      })
      .catch(() => {
        if (!cancelled) setPeople([])
      })
    return () => {
      cancelled = true
    }
  }, [setPeople])

  if (people.length === 0) return null

  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <span className="font-bold text-sm text-gray-800">People</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Selected: {selectedPersonIds.size} / {people.length}
          </span>
          <Button variant="outline" size="sm" onClick={selectAllPeople}>
            Select all
          </Button>
          <Button variant="outline" size="sm" onClick={clearAllPeople}>
            Clear
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 max-h-64 overflow-auto">
        {people.map((person) => {
          const id = String(person?.id ?? '').trim()
          if (!id) return null
          const name = person?.name ?? id
          const checked = selectedPersonIds.has(id)
          return (
            <label
              key={id}
              className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => togglePersonSelected(id)}
                aria-label={`Select ${name}`}
              />
              <span className="text-sm font-medium text-gray-800">{name}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
