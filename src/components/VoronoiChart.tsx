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

export function VoronoiChart() {
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
    highlightedSkillKeys,
    setHighlightedSkillKeys,
    drillDownToDomain,
    chartGoBack,
  } = useSkillsContext()

  const isPeopleMode = people.length > 0

  // Structure effect: rebuild chart only when view or selection data changes.
  // Do NOT depend on highlightedSkillKeys so hover does not tear down the chart and break click.
  useEffect(() => {
    if (!svgRef.current || !chartViewData) return
    // #region agent log
    fetch('http://127.0.0.1:7248/ingest/395f4444-8b3f-4f30-b1b4-d17e833187aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VoronoiChart.tsx:effect',message:'chart effect run',data:{isChartOverview,viewDataName:(chartViewData as { name?: string })?.name,hasChildren:Array.isArray((chartViewData as { children?: unknown[] })?.children)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,E'})}).catch(()=>{});
    // #endregion
    const circlePolygon = createCirclePolygon(CHART_RADIUS, 64)
    const centerX = CHART_WIDTH / 2
    const centerY = CHART_HEIGHT / 2

    const root = d3.hierarchy(chartViewData as unknown as Record<string, unknown>)
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
      .style('cursor', isChartOverview ? 'pointer' : 'default')
      .on('click', function (event, d) {
        event.stopPropagation()
        // #region agent log
        fetch('http://127.0.0.1:7248/ingest/395f4444-8b3f-4f30-b1b4-d17e833187aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VoronoiChart.tsx:skill-cell click',message:'click',data:{isChartOverview,hasParent:!!d?.parent,parentName:(d?.parent?.data as { name?: string })?.name,taxonomyName:taxonomyData?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
        // #endregion
        if (!isChartOverview) return
        const parent = d?.parent?.data as { name?: string } | undefined
        // #region agent log
        fetch('http://127.0.0.1:7248/ingest/395f4444-8b3f-4f30-b1b4-d17e833187aa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'VoronoiChart.tsx:after parent',message:'parent check',data:{parentName:parent?.name,taxonomyName:taxonomyData?.name,willCallDrill:!!(parent && taxonomyData && parent.name !== taxonomyData.name)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (parent && taxonomyData && parent.name !== taxonomyData.name) {
          drillDownToDomain(d.parent!.data as TaxonomyDomain)
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
  ])

  // Highlight-only effect: update stroke on existing cells without rebuilding chart.
  // Keeps click handlers intact when user hovers table rows.
  useEffect(() => {
    if (!svgRef.current) return
    const sel = d3.select(svgRef.current).selectAll<SVGPathElement, LeafNode>('.skill-cell')
    sel
      .attr('stroke', (d) => {
        const skillKey = (d?.data as { __skillKey?: string })?.__skillKey ?? ''
        return highlightedSkillKeys.has(skillKey) ? '#FFD700' : '#fff'
      })
      .attr('stroke-width', (d) => {
        const skillKey = (d?.data as { __skillKey?: string })?.__skillKey ?? ''
        return highlightedSkillKeys.has(skillKey) ? 4 : 1.5
      })
  }, [highlightedSkillKeys])

  return <svg ref={svgRef} id="chart" />
}
