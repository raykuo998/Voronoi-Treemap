import { Fragment } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePersonTableData } from '@/lib/table-data'
import { useChartHighlight } from '@/hooks/useChartHighlight'
import { useSkillsContext } from '@/contexts/SkillsContext'
import type { PersonTableRow } from '@/types'

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
    { header: 'Person', accessorKey: 'personName', cell: ({ row }) => <span className="font-medium">{row.original.personName}</span> },
    {
      header: 'Total usage',
      accessorKey: 'totalUsage',
      cell: ({ row }) => row.original.totalUsage.toLocaleString(),
    },
    {
      header: '% of chart',
      accessorKey: 'chartPercentage',
      cell: ({ row }) => `${row.original.chartPercentage.toFixed(1)}%`,
    },
    {
      header: 'Domain distribution',
      accessorKey: 'domainBreakdown',
      cell: ({ row }) => {
        const d = row.original.domainBreakdown
        return (
          <span className="text-xs">
            {Object.entries(d)
              .map(([k, v]) => `${k} ${v}%`)
              .join(' · ')}
          </span>
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
                      <Table>
                        <TableHeader className="border-b">
                          <TableRow className="hover:bg-muted/30">
                            <TableHead className="w-8" />
                            <TableHead>Domain</TableHead>
                            <TableHead>Skill</TableHead>
                            <TableHead>Usage</TableHead>
                            <TableHead className="w-32">Bar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {row.original.skills.map((s) => (
                            <TableRow key={s.skillKey}>
                              <TableCell />
                              <TableCell className="text-muted-foreground">{s.domain}</TableCell>
                              <TableCell>{s.skillName}</TableCell>
                              <TableCell>{s.usage}</TableCell>
                              <TableCell>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary/80"
                                    style={{ width: `${Math.min(100, s.usage)}%` }}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
