# Voronoi Treemap Implementation - D3.js Technical Documentation

## Overview
This document outlines the D3.js modules and implementation approach used to create an interactive circular Voronoi Treemap visualization.

## Dependencies

### Primary Library
- **D3.js v7.x** (latest stable version)
  - CDN: `https://cdn.jsdelivr.net/npm/d3@7`
  - NPM: `npm install d3@7`

### Required D3 Modules

#### 1. Hierarchy Module (`d3-hierarchy`)
Used for processing hierarchical data structures.

**Methods used:**
- `d3.hierarchy(data)` - Convert nested data into hierarchy
- `.sum(accessor)` - Calculate cumulative values
- `.sort(comparator)` - Sort nodes by value
- `.leaves()` - Get all leaf nodes (countries)

**Example:**
```javascript
const root = d3.hierarchy(data)
  .sum(d => d.value || 1)
  .sort((a, b) => (b.value || 0) - (a.value || 0));
```

#### 2. Pack Layout (`d3-hierarchy`)
Generates circular packing layout for seed point positioning.

**Methods used:**
- `d3.pack()` - Create pack layout generator
- `.size([width, height])` - Set layout dimensions
- `.padding(padding)` - Set spacing between circles

**Example:**
```javascript
const pack = d3.pack()
  .size([radius * 2, radius * 2])
  .padding(3);

pack(root);
```

#### 3. Delaunay Module (`d3-delaunay`)
Creates Delaunay triangulation for Voronoi diagram generation.

**Methods used:**
- `d3.Delaunay.from(points)` - Create Delaunay triangulation
- `.voronoi([xmin, ymin, xmax, ymax])` - Generate Voronoi diagram
- `.renderCell(index)` - Get SVG path for specific cell

**Example:**
```javascript
const sites = nodes.map(d => [d.x, d.y]);
const delaunay = d3.Delaunay.from(sites);
const voronoi = delaunay.voronoi([-radius, -radius, radius, radius]);

// Render each cell
const path = voronoi.renderCell(i);
```

#### 4. Color Interpolation (`d3-scale`, `d3-interpolate`)
Color schemes for continent grouping.

**Methods used:**
- `d3.interpolatePurples` - Purple color scheme (Asia)
- `d3.interpolateReds` - Red color scheme (Americas)
- `d3.interpolateGreens` - Green color scheme (Africa)
- `d3.interpolateBlues` - Blue color scheme (Europe)

**Example:**
```javascript
const colorScheme = d3.interpolatePurples;
const color = colorScheme(0.4 + (index / total) * 0.5);
```

#### 5. Selection & DOM Manipulation (`d3-selection`)
Core D3 functionality for SVG manipulation.

**Methods used:**
- `d3.select(selector)` - Select DOM element
- `.append(type)` - Add new element
- `.attr(name, value)` - Set attribute
- `.style(name, value)` - Set CSS style
- `.on(event, handler)` - Attach event listener
- `.data(array)` - Bind data to selection
- `.join(type)` - Data join pattern

## Implementation Architecture

### Step-by-Step Process

```
1. Data Hierarchy Creation
   └─> d3.hierarchy() + .sum() + .sort()

2. Spatial Layout Generation
   └─> d3.pack() to position nodes in circle

3. Extract Seed Points
   └─> Map node centers: [node.x, node.y]

4. Voronoi Diagram Generation
   └─> d3.Delaunay.from(sites).voronoi(bounds)

5. SVG Rendering
   └─> .renderCell(i) to create path data

6. Circular Clipping
   └─> SVG clipPath with circle element

7. Color Assignment
   └─> d3.interpolate* based on parent continent

8. Interaction Handling
   └─> Event listeners for drill-down navigation
```

## Key Implementation Details

### 1. Circular Boundary Clipping
```javascript
// Create clip path
svg.append('defs')
  .append('clipPath')
  .attr('id', 'circle-clip')
  .append('circle')
  .attr('cx', 0)
  .attr('cy', 0)
  .attr('r', radius);

// Apply to group
const g = svg.append('g')
  .attr('transform', `translate(${centerX},${centerY})`)
  .attr('clip-path', 'url(#circle-clip)');
```

### 2. Weighted Centroid Calculation for Labels
```javascript
// Calculate weighted center for each continent
const weightedX = nodes.reduce((sum, node) => 
  sum + (node.x - radius) * node.value, 0) / totalValue;
const weightedY = nodes.reduce((sum, node) => 
  sum + (node.y - radius) * node.value, 0) / totalValue;
const angle = Math.atan2(weightedY, weightedX);
```

### 3. Hierarchical Color Inheritance
```javascript
const getNodeColor = (d, i) => {
  // Determine continent from parent or current data
  const continentName = data.name === "World" 
    ? d.parent.data.name 
    : data.name;
  
  // Use continent-specific color scheme
  const colorScheme = continentColorSchemes[continentName];
  return colorScheme(0.4 + (index / total) * 0.5);
};
```

## Installation & Setup

### Option 1: CDN (Recommended for standalone HTML)
```html
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script>
  // D3 is globally available as 'd3'
  console.log(d3.version); // Should output "7.x.x"
</script>
```

### Option 2: NPM (For React/Next.js projects)
```bash
npm install d3@7
```

```javascript
import * as d3 from 'd3';

// Or import specific modules
import { hierarchy, pack } from 'd3-hierarchy';
import { Delaunay } from 'd3-delaunay';
import { interpolatePurples, interpolateReds } from 'd3-scale-chromatic';
```

### Option 3: Specific Module Imports (Smaller bundle size)
```bash
npm install d3-hierarchy d3-delaunay d3-scale-chromatic d3-selection
```

```javascript
import { hierarchy, pack } from 'd3-hierarchy';
import { Delaunay } from 'd3-delaunay';
import { 
  interpolatePurples, 
  interpolateReds, 
  interpolateGreens, 
  interpolateBlues 
} from 'd3-scale-chromatic';
import { select } from 'd3-selection';
```

## Data Structure Requirements

### Input Data Format
```typescript
interface DataNode {
  name: string;           // Node name (required)
  value?: number;         // Numeric value for leaf nodes (optional for parents)
  children?: DataNode[];  // Child nodes for hierarchical structure
}

// Example
const data = {
  name: "World",
  children: [
    {
      name: "Asia",
      children: [
        { name: "China", value: 1411778724 },
        { name: "India", value: 1380004385 }
      ]
    },
    {
      name: "Americas",
      children: [
        { name: "United States", value: 331002651 },
        { name: "Brazil", value: 212559417 }
      ]
    }
  ]
};
```

## Performance Considerations

1. **Voronoi Computation Complexity**: O(n log n) where n = number of nodes
2. **Recommended Node Limits**:
   - Optimal: 20-50 nodes
   - Maximum: 100 nodes (may experience slowdown)
3. **Browser Compatibility**: Requires ES6+ support
4. **SVG Rendering**: Hardware acceleration recommended for smooth interactions

## Known Limitations

1. **Not True Voronoi Treemap Algorithm**
   - Uses Circle Packing + Voronoi instead of iterative Lloyd's relaxation
   - Area proportions are approximate, not exact
   - Faster computation but less accurate than academic implementation

2. **Alternative for True Voronoi Treemap**
   - Library: `d3-voronoi-treemap` by Kcnarf
   - Installation: `npm install d3-voronoi-treemap d3-voronoi-map`
   - Provides more accurate area representation but slower

## Browser Support

- Chrome/Edge: v90+
- Firefox: v88+
- Safari: v14+
- Opera: v76+

## References

- D3.js Documentation: https://d3js.org/
- d3-hierarchy: https://github.com/d3/d3-hierarchy
- d3-delaunay: https://github.com/d3/d3-delaunay
- Voronoi Diagram: https://en.wikipedia.org/wiki/Voronoi_diagram

## License

D3.js is released under the ISC License (MIT-compatible).
Free for commercial use, modification, and distribution.

---

**Note for Engineers**: This implementation prioritizes simplicity and performance over mathematical accuracy. For production use with strict area proportion requirements, consider implementing true Voronoi Treemap algorithm or using specialized libraries.
