import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { voronoiTreemap as d3VoronoiTreemap } from 'd3-voronoi-treemap'
import { useSkillsContext } from '@/contexts/SkillsContext'
import {
  CHART_HEIGHT,
  CHART_RADIUS,
  CHART_WIDTH,
  createCirclePolygon,
  getDomainColorScheme,
  getSelectionMetricsForSkillKey,
  getSubSkillCounts,
  getUsageValue,
  mulberry32,
} from '@/lib/chart-utils'
import { makeSkillKey } from '@/lib/taxonomy'
import type { TaxonomyDomain } from '@/types'

type LeafNode = d3.HierarchyNode<unknown> & { polygon?: [number, number][] }

export type DomainLabelPosition = { domainName: string; x: number; y: number; color: string }

type VoronoiChartProps = {
  onDomainPositionsChange?: (positions: DomainLabelPosition[]) => void
}

export function VoronoiChart({ onDomainPositionsChange }: VoronoiChartProps = {}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const {
    people,
    taxonomyData,
    chartViewData,
    isChartOverview,
    selectionAggBySkillKey,
    selectionAggSelectedCount,
    usageTGlobal,
    hiddenSkillKeys,
    effectiveHighlightedSkillKeys,
    setHighlightedSkillKeys,
    drillDownToDomain,
    chartGoBack,
  } = useSkillsContext()

  const isPeopleMode = people.length > 0

  // Structure effect: rebuild chart only when view or selection data changes.
  // Overview = all skills (one cell per skill, colored by domain). Domain view = one domain's skills; click any → back.
  useEffect(() => {
    if (!svgRef.current || !chartViewData) return
    const circlePolygon = createCirclePolygon(CHART_RADIUS, 64)
    const centerX = CHART_WIDTH / 2
    const centerY = CHART_HEIGHT / 2

    const root = d3.hierarchy(chartViewData as unknown as Record<string, unknown>)
      .sum((d: unknown) => {
        const node = d as { children?: unknown[]; __domain?: string; __skillKey?: string; name?: string }
        if (node && Array.isArray(node.children) && node.children.length > 0) return 0
        const domainName = (node as { __domain?: string }).__domain ?? ''
        const skillKey =
          (node as { __skillKey?: string }).__skillKey ?? makeSkillKey(domainName, (node as { name?: string }).name ?? '')
        if (hiddenSkillKeys.has(skillKey)) return 0.001
        if (isPeopleMode) {
          const metrics = getSelectionMetricsForSkillKey(skillKey, selectionAggBySkillKey, selectionAggSelectedCount)
          if (metrics.selectedCount === 0) return 0.001
          return Math.max(0.001, metrics.unlockedSum)
        }
        return Math.max(0.001, getSubSkillCounts(node as Parameters<typeof getSubSkillCounts>[0]).unlocked)
      })
      .sort((a, b) => {
        const ka = String((a?.data as { __skillKey?: string })?.__skillKey ?? (a?.data as { name?: string })?.name ?? '')
        const kb = String((b?.data as { __skillKey?: string })?.__skillKey ?? (b?.data as { name?: string })?.name ?? '')
        return ka.localeCompare(kb)
      })

    try {
      const vtm = d3VoronoiTreemap()
        .clip(circlePolygon)
        .convergenceRatio(0.001)
        .maxIterationCount(100)
        .minWeightRatio(0.001)
        .prng(mulberry32(1337))
      vtm(root as unknown as Parameters<typeof vtm>[0])
    } catch (err) {
      console.warn('d3-voronoi-treemap failed:', err)
      d3.select(svgRef.current).selectAll('*').remove()
      d3.select(svgRef.current)
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#666')
        .attr('font-size', '14px')
        .text('d3-voronoi-treemap unavailable')
      return
    }

    const leaves = root.leaves() as LeafNode[]

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', CHART_WIDTH).attr('height', CHART_HEIGHT)

    const defs = svg.append('defs')
    defs
      .append('clipPath')
      .attr('id', 'circle-clip')
      .append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', CHART_RADIUS)

    const g = svg
      .append('g')
      .attr('transform', `translate(${centerX},${centerY})`)
      .attr('clip-path', 'url(#circle-clip)')

    g.on('click', function (event: MouseEvent) {
      if (event.target === this && !isChartOverview) chartGoBack()
    })

    g.selectAll<SVGPathElement, LeafNode>('.skill-cell')
      .data(leaves)
      .join('path')
      .attr('class', 'skill-cell')
      .attr('data-skill-key', (d) => (d?.data as { __skillKey?: string })?.__skillKey ?? '')
      .attr('d', (d) => (d.polygon ? 'M' + d.polygon.join('L') + 'Z' : ''))
      .attr('fill', (d) => {
        const domainName = (d?.parent?.data as { name?: string })?.name ?? (d?.data as { __domain?: string })?.__domain ?? 'Unknown'
        const skillKey = (d?.data as { __skillKey?: string })?.__skillKey ?? makeSkillKey(domainName, (d?.data as { name?: string })?.name ?? '')
        const colorScheme = getDomainColorScheme(domainName)
        if (isPeopleMode) {
          const metrics = getSelectionMetricsForSkillKey(skillKey, selectionAggBySkillKey, selectionAggSelectedCount)
          return colorScheme(usageTGlobal(metrics.usageAvg))
        }
        return colorScheme(usageTGlobal(getUsageValue(d?.data as Parameters<typeof getUsageValue>[0])))
      })
      .attr('opacity', (d) => {
        const skillKey = (d?.data as { __skillKey?: string })?.__skillKey ?? ''
        if (hiddenSkillKeys.has(skillKey)) return 0.2
        if (isPeopleMode) {
          const metrics = getSelectionMetricsForSkillKey(skillKey, selectionAggBySkillKey, selectionAggSelectedCount)
          if (metrics.selectedCount === 0) return 0.15
          return 0.25 + 0.75 * metrics.unlockedPeopleRatio
        }
        return 0.9
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .on('click', function (event, d) {
        event.stopPropagation()
        if (!isChartOverview) {
          chartGoBack()
          return
        }
        const parent = d?.parent?.data as { name?: string } | undefined
        if (parent && taxonomyData && parent.name !== taxonomyData.name) {
          drillDownToDomain(d!.parent!.data as TaxonomyDomain)
        }
      })
      .on('mouseover', function (_event, d) {
        d3.select(this).attr('opacity', 1)
        const skillKey = (d?.data as { __skillKey?: string })?.__skillKey ?? ''
        if (skillKey) setHighlightedSkillKeys(new Set([skillKey]))
      })
      .on('mouseout', () => {
        setHighlightedSkillKeys(new Set())
      })

    const domainNameFor = (d: LeafNode) =>
      (d?.parent?.data as { name?: string })?.name ?? (d?.data as { __domain?: string })?.__domain ?? ''

    const domainLabelOffset = 52
    const byDomain = new Map<string, LeafNode[]>()
    leaves.forEach((leaf) => {
      const name = domainNameFor(leaf)
      if (!name) return
      if (!byDomain.has(name)) byDomain.set(name, [])
      byDomain.get(name)!.push(leaf)
    })
    const domainPositions: DomainLabelPosition[] = []
    byDomain.forEach((domainLeaves, domainName) => {
      let cx = 0
      let cy = 0
      let n = 0
      domainLeaves.forEach((leaf) => {
        if (leaf.polygon) {
          const c = d3.polygonCentroid(leaf.polygon)
          cx += c[0]
          cy += c[1]
          n += 1
        }
      })
      if (n === 0) return
      cx /= n
      cy /= n
      const len = Math.sqrt(cx * cx + cy * cy) || 1
      const r = CHART_RADIUS + domainLabelOffset
      const color = getDomainColorScheme(domainName)(0.6)
      domainPositions.push({ domainName, x: (cx / len) * r, y: (cy / len) * r, color })
    })

    onDomainPositionsChange?.(domainPositions)

    g.selectAll<SVGTextElement, LeafNode>('.skill-label')
      .data(leaves)
      .join('text')
      .attr('class', 'skill-label')
      .attr('x', (d) => (d.polygon ? d3.polygonCentroid(d.polygon)[0] : 0))
      .attr('y', (d) => (d.polygon ? d3.polygonCentroid(d.polygon)[1] : 0))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', (d) => {
        if (!d.polygon) return '10px'
        const area = Math.abs(d3.polygonArea(d.polygon))
        return Math.max(8, Math.min(18, Math.sqrt(area) / 10)) + 'px'
      })
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text((d) => {
        if (!d.polygon) return ''
        const area = Math.abs(d3.polygonArea(d.polygon))
        const name = (d.data as { name?: string }).name ?? ''
        if (area > 8000) return name
        if (area > 4000) return name.length > 10 ? name.substring(0, 10) : name
        if (area > 2000) return name.length > 6 ? name.substring(0, 6) : name
        return ''
      })

    return () => {
      svg.selectAll('*').remove()
      onDomainPositionsChange?.([])
    }
  }, [
    chartViewData,
    taxonomyData,
    isChartOverview,
    isPeopleMode,
    selectionAggBySkillKey,
    selectionAggSelectedCount,
    usageTGlobal,
    hiddenSkillKeys,
    drillDownToDomain,
    chartGoBack,
    onDomainPositionsChange,
  ])

  // Highlight-only effect: update stroke on existing cells without rebuilding chart.
  // Uses effectiveHighlightedSkillKeys (pinned person from table click or hover).
  useEffect(() => {
    if (!svgRef.current) return
    const sel = d3.select(svgRef.current).selectAll<SVGPathElement, LeafNode>('.skill-cell')
    sel
      .attr('stroke', '#fff')
      .attr('stroke-width', (d) => {
        const skillKey = (d?.data as { __skillKey?: string })?.__skillKey ?? ''
        return effectiveHighlightedSkillKeys.has(skillKey) ? 4 : 1.5
      })
  }, [effectiveHighlightedSkillKeys])

  return <svg ref={svgRef} id="chart" />
}
