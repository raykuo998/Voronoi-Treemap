# Voronoi Treemap - Nested Hierarchical Visualization

A NATO-style population visualization using weighted Voronoi Treemap algorithm to display world population distribution grouped by continents.

![Voronoi Treemap](image.png)

## 🌟 Features

- **Weighted Area Distribution**: Cell area accurately represents population proportion
- **Hierarchical Grouping**: Countries grouped by continent with clear regional boundaries
- **Interactive Drill-Down**: Click any country to zoom into its continent view
- **NATO-Style Layout**: Clean regional clusters with thick continental borders
- **Responsive Design**: Circular layout with adaptive labels

## 🎯 Why This Approach?

### Problem with Standard Voronoi
Standard Voronoi diagrams (like `d3.Delaunay`) only distribute space based on seed point distance, completely ignoring weights. This results in:
- Small population countries appearing disproportionately large
- No natural grouping of related entities
- Fragmented, random-looking distributions

### Solution: Weighted Voronoi Treemap
Uses the `d3-voronoi-treemap` library which:
- Iteratively adjusts cell boundaries to match area with weight
- Respects hierarchical parent-child relationships
- Creates natural regional clusters (NATO-style effect)
- Achieves 0.1% accuracy through convergence algorithm

## 🏗️ Technical Implementation

### Four-Continent Grouping Strategy

**Why 4 continents instead of 7?**
- Creates cleaner, more distinct regional clusters
- Similar to NATO defense spending visualization approach
- Better visual separation and clarity

**Selected Regions:**
- **Asia** - 10 most populous countries (China, India, Indonesia, etc.)
- **Americas** - North + South America combined (USA, Brazil, Mexico, etc.)
- **Africa** - 5 major population centers (Nigeria, Ethiopia, Egypt, etc.)
- **Europe** - Including Russia (Russia, Germany, UK, France, etc.)

### NATO-Style Effect (3 Steps)

1. **Continental Voronoi**: Calculate 4 large continent polygons using weighted treemap
   - Each continent gets area proportional to its total population
   - Creates distinct regional boundaries

2. **Nested Country Distribution**: Within each continent polygon, distribute countries
   - Countries only appear within their parent continent's boundary
   - Maintains visual grouping (e.g., all Asian countries cluster together)

3. **Continent Borders**: Draw thick borders (#333, 3px) around continent polygons
   - Creates clear visual separation
   - Labels placed outside circle using polygon centroids

### Core Algorithm

```javascript
// 1. Create hierarchical data structure
const worldData = {
    name: "World",
    children: [
        { name: "Asia", children: [/* 10 countries */] },
        { name: "Americas", children: [/* 5 countries */] },
        { name: "Africa", children: [/* 5 countries */] },
        { name: "Europe", children: [/* 6 countries */] }
    ]
};

// 2. Apply weighted Voronoi treemap
const voronoiTreemap = d3.voronoiTreemap()
    .clip(circlePolygon)              // Clip to circular boundary
    .convergenceRatio(0.001)          // 0.1% accuracy threshold
    .maxIterationCount(100)           // Max optimization iterations
    .minWeightRatio(0.001);           // Min cell size threshold

voronoiTreemap(root);                 // Calculates BOTH levels simultaneously

// Result: Each country.polygon is automatically CLIPPED to its parent continent!
```

## 📦 Dependencies

```html
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-weighted-voronoi@1"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-voronoi-map@2"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-voronoi-treemap@1"></script>
```

**⚠️ Critical:** Missing `d3-weighted-voronoi` will cause error: `"i.weightedVoronoi is not a function"`

## 🚀 Quick Start

1. Clone or download this repository
2. Open `index.html` in a modern browser
3. Wait 2-3 seconds for initial calculation
4. Click any country to drill down into continent view
5. Click empty space to return to world view

## 🐛 Bug Fixes Applied

### Bug #1: Area Proportionality Failure
- **Symptom**: China (1.4B population) appeared smaller than Iran (84M)
- **Cause**: Used `d3.Delaunay` which ignores weights
- **Evidence**: Log showed `{"countryName":"China","expectedRatio":"35.7%","actualArea":"8.6%"}`
- **Fix**: Replaced with `d3.voronoiTreemap()`
- **Result**: China now correctly occupies ~24.5% of total area

### Bug #2: Continent Labels at Origin
- **Symptom**: All 4 continent labels stuck in top-left corner
- **Cause**: `voronoiTreemap()` doesn't preserve `continent.x/y` from pack layout
- **Evidence**: Log showed `{"x":undefined,"y":undefined,"angle":null,"labelX":null}`
- **Fix**: Changed to `Math.atan2(centroid[1], centroid[0])` where `centroid = d3.polygonCentroid(continent.polygon)`
- **Result**: Labels correctly distributed around circle perimeter

## ⚡ Performance

- **Initial Render**: ~2-3 seconds for 26 countries across 4 continents
- **Convergence**: Up to 100 iterations to achieve 0.1% accuracy
- **Polygon Clipping**: 64-point circle for smooth boundaries

## 📊 Data Structure

```javascript
{
    name: "World",
    children: [
        {
            name: "Asia",
            children: [
                { name: "China", value: 1411778724 },
                { name: "India", value: 1380004385 },
                // ... 8 more countries
            ]
        },
        // ... 3 more continents
    ]
}
```

## 🎨 Visualization Details

- **Color Scheme**: Each continent has a distinct color family
  - Asia: Purple
  - Americas: Red
  - Africa: Green
  - Europe: Blue
- **Borders**: White strokes (1.5px) between countries, thick black (3px) between continents
- **Labels**: Dynamic font size based on cell area (8-18px)
- **Opacity**: 0.9 default, 1.0 on hover

## 🔧 Customization

### Change Convergence Accuracy
```javascript
.convergenceRatio(0.001)  // 0.1% accuracy (lower = more accurate, slower)
```

### Adjust Circle Resolution
```javascript
const circlePoints = 64;  // Higher = smoother circle (slower)
```

### Modify Color Schemes
```javascript
const continentColorSchemes = {
    'Asia': d3.interpolatePurples,
    'Americas': d3.interpolateReds,
    'Africa': d3.interpolateGreens,
    'Europe': d3.interpolateBlues
};
```

## 📖 References

- [d3-voronoi-treemap Documentation](https://github.com/Kcnarf/d3-voronoi-treemap)
- [Weighted Voronoi Stippling](http://www.cs.ubc.ca/labs/imager/tr/2002/secord2002b/)
- [NATO Defense Spending Visualization](https://www.economist.com/graphic-detail/2022/02/24/which-european-countries-rely-on-russian-energy) (Inspiration)

## 📄 License

MIT License - Feel free to use and modify

## 🤝 Contributing

Suggestions and improvements are welcome! Please open an issue or submit a pull request.

---

**Note**: This visualization uses population data as a demonstration. The same technique can be applied to any weighted hierarchical data (GDP, market share, budget allocation, etc.).
