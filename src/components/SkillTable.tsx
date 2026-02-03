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
  const { toggleSkillVisibility } = useSkillsContext()

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
    { header: 'Skill', accessorKey: 'skillName', cell: ({ row }) => <span className="font-medium">{row.original.skillName}</span> },
    { header: 'Domain', accessorKey: 'domainName', cell: ({ row }) => row.original.domainName },
    {
      header: 'Total usage',
      accessorKey: 'totalUsage',
      cell: ({ row }) => row.original.totalUsage.toLocaleString(),
    },
    {
      header: 'Avg usage',
      accessorKey: 'avgUsage',
      cell: ({ row }) => Math.round(row.original.avgUsage).toLocaleString(),
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
                            <TableHead>Usage</TableHead>
                            <TableHead>%</TableHead>
                            <TableHead className="w-32">Bar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {row.original.contributors.map((c) => (
                            <TableRow key={c.personId}>
                              <TableCell />
                              <TableCell>{c.personName}</TableCell>
                              <TableCell>{c.usage}</TableCell>
                              <TableCell>{c.percentage.toFixed(1)}%</TableCell>
                              <TableCell>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary/80"
                                    style={{ width: `${Math.min(100, c.percentage)}%` }}
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
