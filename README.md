# remesh-threejs

TypeScript library for adaptive remeshing of non-manifold surfaces using Three.js.

Based on the EUROGRAPHICS 2008 paper ["Adaptive Remeshing of Non-Manifold Surfaces"](https://doi.org/10.1111/j.1467-8659.2008.01285.x) by Zilske, Lamecker, and Zachow.

## Features

- **Non-manifold mesh support**: Extended halfedge data structure supporting edges with more than 2 incident faces
- **Feature skeleton**: Unified treatment of non-manifold edges, feature lines, and boundary edges
- **Adaptive remeshing**: Edge splitting, contraction, flipping, and vertex smoothing
- **Analysis tools**: Detect and classify non-manifold vertices and edges
- **Spatial acceleration**: SpatialHash and BVH for efficient queries on large meshes (500K+ triangles)
- **Three.js integration**: Import/export BufferGeometry with visualization helpers

## Installation

```bash
npm install remesh-threejs three
```

## Quick Start

### Basic Remeshing

```typescript
import { BufferGeometry } from 'three';
import { remesh } from 'remesh-threejs';

// Remesh a geometry with default options
const result = remesh(inputGeometry, {
  targetEdgeLength: 0.1,
  iterations: 5,
});

console.log(`Remeshed in ${result.stats.iterations} iterations`);
const outputGeometry = result.geometry;
```

### Analyze Mesh for Non-Manifold Issues

```typescript
import { analyzeManifold, isManifold } from 'remesh-threejs';

// Quick check
if (!isManifold(geometry)) {
  console.log('Mesh has non-manifold edges');
}

// Detailed analysis
const analysis = analyzeManifold(geometry);
console.log(`Non-manifold edges: ${analysis.nonManifoldEdgeCount}`);
console.log(`Non-manifold vertices: ${analysis.nonManifoldVertexCount}`);
console.log(`Boundary edges: ${analysis.boundaryEdgeCount}`);
```

### Advanced Usage with Full Control

```typescript
import {
  NonManifoldMesh,
  AdaptiveRemesher,
  classifyAllVertices,
  validateTopology,
  exportBufferGeometry,
} from 'remesh-threejs';

// Create mesh from geometry
const mesh = NonManifoldMesh.fromBufferGeometry(inputGeometry);

// Classify vertices (required for skeleton-aware smoothing)
classifyAllVertices(mesh);

// Create remesher with options
const remesher = new AdaptiveRemesher(mesh, {
  targetEdgeLength: 0.1,
  minEdgeLength: 0.05,
  maxEdgeLength: 0.2,
  qualityThreshold: 0.3,
  iterations: 10,
});

// Run remeshing
const stats = remesher.run();

// Validate result
const validation = validateTopology(mesh);
if (!validation.isValid) {
  console.error('Topology errors:', validation.errors);
}

// Export result
const outputGeometry = exportBufferGeometry(mesh);
```

## API Reference

### Main Functions

| Function | Description |
|----------|-------------|
| `remesh(geometry, options?)` | One-shot remeshing of a BufferGeometry |
| `analyzeManifold(geometry)` | Analyze mesh for non-manifold features |
| `isManifold(geometry)` | Quick check if mesh is manifold |
| `validateTopology(mesh)` | Validate mesh topology integrity |

### Core Classes

| Class | Description |
|-------|-------------|
| `NonManifoldMesh` | Main mesh data structure with halfedge connectivity |
| `AdaptiveRemesher` | Iterative remeshing algorithm |
| `ManifoldAnalyzer` | Analysis with caching support |
| `VertexClassifier` | Classify vertices by skeleton topology |
| `TopologyValidator` | Validate mesh topology invariants |

### Mesh Operations

| Function | Description |
|----------|-------------|
| `splitEdge(mesh, edge, t?)` | Split an edge at parameter t |
| `splitLongEdges(mesh, maxLength)` | Split all edges exceeding length |
| `contractEdge(mesh, edge)` | Contract an edge to a single vertex |
| `contractShortEdges(mesh, minLength)` | Contract all edges below length |
| `flipEdge(mesh, edge)` | Flip a manifold edge |
| `makeDelaunay(mesh)` | Flip edges to achieve Delaunay triangulation |
| `smoothAllVertices(mesh, skeleton?, lambda?)` | Tangential smoothing |

### Vertex Classification

Vertices are classified based on their relationship to the feature skeleton:

| Type | Description | Constraint |
|------|-------------|------------|
| `Manifold` | Standard interior vertex | Free movement in 3D |
| `OpenBook` | On exactly 2 skeleton edges | Constrained to skeleton |
| `SkeletonBranching` | On 1 or >2 skeleton edges | Position fixed |
| `NonManifoldOther` | Other non-manifold config | Position fixed |

### Edge Classification

| Type | Description |
|------|-------------|
| `Manifold` | Exactly 2 incident faces |
| `NonManifold` | More than 2 incident faces |
| `Feature` | User-marked feature edge |
| `Boundary` | Only 1 incident face |

### Spatial Structures

```typescript
import { SpatialHash, BVH, createBVHFromMesh } from 'remesh-threejs';

// Fast neighbor queries
const hash = new SpatialHash<Vertex>(cellSize);
hash.insert(vertex, vertex.position);
const neighbors = hash.queryRadius(position, radius);

// Closest point queries
const bvh = createBVHFromMesh(mesh);
const result = bvh.closestPoint(queryPoint);
```

### Visualization Helpers

```typescript
import {
  exportSkeletonGeometry,
  exportClassificationGeometry,
  exportQualityGeometry,
} from 'remesh-threejs';

// Visualize the feature skeleton as line segments
const skeletonLines = exportSkeletonGeometry(mesh);

// Color vertices by classification type
const classifiedMesh = exportClassificationGeometry(mesh);

// Color faces by triangle quality (red=poor, green=good)
const qualityMesh = exportQualityGeometry(mesh);
```

## Options

```typescript
interface RemeshOptions {
  // Target edge length (default: auto-computed)
  targetEdgeLength?: number;

  // Edge length bounds (default: 0.5x and 2x target)
  minEdgeLength?: number;
  maxEdgeLength?: number;

  // Minimum triangle quality threshold (default: 0.3)
  qualityThreshold?: number;

  // Maximum iterations (default: 10)
  iterations?: number;

  // Smoothing strength (default: 0.5)
  smoothingLambda?: number;

  // Preserve non-manifold features (default: true)
  preserveFeatures?: boolean;
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build library
npm run build

# Lint and format
npm run quality:fix

# Full validation (lint + test + build)
npm run validate
```

## Test Coverage

The library includes comprehensive tests covering:

- Type system and branded IDs
- Core data structures (Vertex, Edge, Face, Halfedge)
- Geometric utilities (40+ functions)
- Spatial acceleration (SpatialHash, BVH)
- Analysis tools (manifold detection, classification, validation)
- Full remeshing pipeline integration

Run `npm run test:coverage` to see the detailed coverage report.

## License

MIT
