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
import { useSkillTableData } from '@/lib/table-data'
import { useChartHighlight } from '@/hooks/useChartHighlight'
import { useSkillsContext } from '@/contexts/SkillsContext'
import type { SkillTableRow } from '@/types'

export function SkillTable() {
  const data = useSkillTableData()
  const { highlightBySkillKey, clearHighlight } = useChartHighlight()
  const { toggleSkillVisibility, taxonomyData, isChartOverview, drillDownToDomain } = useSkillsContext()

  const columns: ColumnDef<SkillTableRow>[] = [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) =>
        row.original.contributors.length > 0 ? (
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
              toggleSkillVisibility(r.skillKey)
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
    { header: 'Skill', accessorKey: 'skillName', cell: ({ row }) => <span className="font-medium">{row.original.skillName}</span> },
    { header: 'Domain', accessorKey: 'domainName', cell: ({ row }) => row.original.domainName },
    {
      header: 'Total utilization',
      accessorKey: 'totalUsage',
      cell: ({ row }) => row.original.totalUsage.toLocaleString(),
    },
    {
      header: 'Total coverage',
      id: 'totalCoverage',
      cell: ({ row }) => {
        const { unlockedUnionCount, totalSubSkills } = row.original
        if (totalSubSkills === 0) return <span className="text-muted-foreground">—</span>
        const pct = (unlockedUnionCount / totalSubSkills) * 100
        return (
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/80"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="tabular-nums text-xs text-muted-foreground w-8">
              {unlockedUnionCount}/{totalSubSkills}
            </span>
          </div>
        )
      },
    },
    {
      header: 'Contributors',
      accessorKey: 'contributorCount',
      cell: ({ row }) => `${row.original.contributorCount} people`,
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getRowCanExpand: (row) => row.original.contributors.length > 0,
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
                  className="cursor-pointer"
                  onMouseEnter={() => highlightBySkillKey(row.original.skillKey)}
                  onMouseLeave={() => clearHighlight()}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return
                    if (!isChartOverview || !taxonomyData?.children) return
                    const domain = taxonomyData.children.find((d) => d.name === row.original.domainName)
                    if (domain) drillDownToDomain(domain)
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
                            <TableHead>Person</TableHead>
                            <TableHead>Utilization</TableHead>
                            <TableHead className="w-40">Coverage</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {row.original.contributors.map((c) => {
                            const pct = c.totalSubSkills > 0 ? (c.unlockedCount / c.totalSubSkills) * 100 : 0
                            return (
                              <TableRow key={c.personId}>
                                <TableCell />
                                <TableCell>{c.personName}</TableCell>
                                <TableCell>{c.usage}</TableCell>
                                <TableCell>
                                  {c.totalSubSkills === 0 ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <div className="flex items-center gap-2 min-w-[120px]">
                                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-primary/80"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className="tabular-nums text-xs text-muted-foreground w-8">
                                        {c.unlockedCount}/{c.totalSubSkills}
                                      </span>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
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
