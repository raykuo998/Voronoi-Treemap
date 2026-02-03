declare module 'd3-voronoi-treemap' {
  import type { HierarchyNode } from 'd3-hierarchy'
  type VoronoiTreemap = {
    (root: HierarchyNode<unknown>): void
    clip(polygon: [number, number][]): VoronoiTreemap
    convergenceRatio(value: number): VoronoiTreemap
    maxIterationCount(value: number): VoronoiTreemap
    minWeightRatio(value: number): VoronoiTreemap
    prng(generator: () => number): VoronoiTreemap
  }
  export function voronoiTreemap(): VoronoiTreemap
}
