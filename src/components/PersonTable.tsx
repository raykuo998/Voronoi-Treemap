import { Fragment, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePersonTableData } from '@/lib/table-data'
import { useChartHighlight } from '@/hooks/useChartHighlight'
import { getDomainSolidColor } from '@/lib/chart-utils'
import { useSkillsContext } from '@/contexts/SkillsContext'
import type { PersonTableRow } from '@/types'

type SkillRow = PersonTableRow['skills'][number]

function SkillSubTable({ skills }: { skills: SkillRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([])

  const columns: ColumnDef<SkillRow>[] = [
    {
      id: 'spacer',
      header: () => null,
      cell: () => null,
    },
    {
      accessorKey: 'domain',
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Domain
          {column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 size-4" />
          ) : column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 size-4" />
          ) : (
            <ArrowUpDown className="ml-2 size-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.domain}</span>,
    },
    {
      accessorKey: 'skillName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Skill
          {column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 size-4" />
          ) : column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 size-4" />
          ) : (
            <ArrowUpDown className="ml-2 size-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => row.original.skillName,
    },
    {
      accessorKey: 'usage',
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Utilization
          {column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 size-4" />
          ) : column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 size-4" />
          ) : (
            <ArrowUpDown className="ml-2 size-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => row.original.usage,
    },
    {
      id: 'coverage',
      accessorFn: (row) => (row.totalSubSkills > 0 ? row.unlockedCount / row.totalSubSkills : 0),
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-4 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Coverage
          {column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 size-4" />
          ) : column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 size-4" />
          ) : (
            <ArrowUpDown className="ml-2 size-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => {
        const { unlockedCount, totalSubSkills } = row.original
        if (totalSubSkills === 0) return <span className="text-muted-foreground">—</span>
        const pct = (unlockedCount / totalSubSkills) * 100
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="tabular-nums text-xs text-muted-foreground w-8">
              {unlockedCount}/{totalSubSkills}
            </span>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: skills,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Table>
      <TableHeader className="border-b">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-muted/30">
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className={header.id === 'spacer' ? 'w-8' : header.id === 'coverage' ? 'w-40' : undefined}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function PersonTable() {
  const data = usePersonTableData()
  const { highlightByPersonId, clearHighlight } = useChartHighlight()
  const { togglePersonVisibility, pinnedHighlightPersonId, setPinnedHighlightPersonId } = useSkillsContext()

  const columns: ColumnDef<PersonTableRow>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) =>
        row.original.skills.length > 0 ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={row.getToggleExpandedHandler()}
            aria-expanded={row.getIsExpanded()}
            aria-label={row.getIsExpanded() ? 'Collapse' : 'Expand'}
          >
            {row.getIsExpanded() ? (
              <ChevronUp className="opacity-60 size-4" aria-hidden />
            ) : (
              <ChevronDown className="opacity-60 size-4" aria-hidden />
            )}
          </Button>
        ) : null,
    },
    {
      id: 'visibility',
      header: () => null,
      cell: ({ row }) => {
        const r = row.original
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              togglePersonVisibility(r.personId)
            }}
            className="p-1 rounded hover:bg-muted"
            aria-label={r.isVisible ? 'Hide in chart' : 'Show in chart'}
            title={r.isVisible ? 'Hide in chart' : 'Show in chart'}
          >
            {r.isVisible ? <Eye className="size-4 text-muted-foreground" /> : <EyeOff className="size-4 text-muted-foreground" />}
          </button>
        )
      },
    },
    {
      id: 'rank',
      header: 'Rank',
      cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{row.index + 1}</span>,
    },
    {
      accessorKey: 'personName',
      header: 'Person',
      cell: ({ row }) => <span className="font-medium">{row.original.personName}</span>,
    },
    {
      accessorKey: 'totalUsage',
      header: 'Total usage',
      cell: ({ row }) => row.original.totalUsage.toLocaleString(),
    },
    {
      accessorKey: 'chartPercentage',
      header: '% of chart',
      cell: ({ row }) => `${row.original.chartPercentage.toFixed(1)}%`,
    },
    {
      header: 'Domain distribution',
      accessorKey: 'domainBreakdown',
      cell: ({ row }) => {
        const d = row.original.domainBreakdown
        const domainOrder = ['Frontend', 'Backend', 'DevOps', 'Mobile']
        const entries = domainOrder
          .filter((domain) => d[domain] != null)
          .map((domain) => [domain, d[domain]] as const)
        return (
          <div className="flex items-center w-full min-w-[180px]">
            <div className="flex h-3 w-full rounded-sm overflow-hidden">
              {entries.map(([domain, pct]) => (
                <div
                  key={domain}
                  className="h-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: getDomainSolidColor(domain),
                  }}
                  title={`${domain}: ${pct}%`}
                />
              ))}
            </div>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getRowCanExpand: (row) => row.original.skills.length > 0,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <TableRow
                  className={`cursor-pointer ${pinnedHighlightPersonId === row.original.personId ? 'bg-primary/10' : ''}`}
                  onMouseEnter={() =>
                    highlightByPersonId(
                      row.original.personId,
                      row.original.skills.map((s) => s.skillKey)
                    )
                  }
                  onMouseLeave={() => clearHighlight()}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return
                    const id = row.original.personId
                    setPinnedHighlightPersonId((prev) => (prev === id ? null : id))
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.id === 'expander' ? 'w-px py-0' : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                {row.getIsExpanded() && (
                  <TableRow className="hover:bg-transparent bg-muted/30">
                    <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                      <SkillSubTable skills={row.original.skills} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No data. Select people above.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
