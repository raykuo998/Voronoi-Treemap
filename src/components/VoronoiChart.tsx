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

type LeafNode = d3.HierarchyNode<unknown> & { polygon?: [number, number][] }

export function VoronoiChart() {
  const svgRef = useRef<SVGSVGElement>(null)
  const {
    people,
    taxonomyData,
    selectionAggBySkillKey,
    selectionAggSelectedCount,
    usageTGlobal,
    hiddenSkillKeys,
    highlightedSkillKeys,
    setHighlightedSkillKeys,
  } = useSkillsContext()

  const isPeopleMode = people.length > 0

  useEffect(() => {
    if (!svgRef.current || !taxonomyData) return

    const circlePolygon = createCirclePolygon(CHART_RADIUS, 64)
    const centerX = CHART_WIDTH / 2
    const centerY = CHART_HEIGHT / 2

    const root = d3.hierarchy(taxonomyData as unknown as Record<string, unknown>)
      .sum((d: unknown) => {
        const node = d as { children?: unknown[]; __domain?: string; __skillKey?: string; name?: string }
        if (node && Array.isArray(node.children)) return 0
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
      .attr('stroke', (d) => {
        const skillKey = (d?.data as { __skillKey?: string })?.__skillKey ?? ''
        return highlightedSkillKeys.has(skillKey) ? '#FFD700' : '#fff'
      })
      .attr('stroke-width', (d) => {
        const skillKey = (d?.data as { __skillKey?: string })?.__skillKey ?? ''
        return highlightedSkillKeys.has(skillKey) ? 4 : 1.5
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
      .style('cursor', 'pointer')
      .on('mouseover', function (_event, d) {
        d3.select(this).attr('opacity', 1)
        const skillKey = (d?.data as { __skillKey?: string })?.__skillKey ?? ''
        if (skillKey) setHighlightedSkillKeys(new Set([skillKey]))
      })
      .on('mouseout', () => {
        setHighlightedSkillKeys(new Set())
      })

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
    }
  }, [
    taxonomyData,
    isPeopleMode,
    selectionAggBySkillKey,
    selectionAggSelectedCount,
    usageTGlobal,
    hiddenSkillKeys,
    highlightedSkillKeys,
    setHighlightedSkillKeys,
  ])

  return <svg ref={svgRef} id="chart" />
}
