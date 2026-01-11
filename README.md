# remesh-threejs

[![npm version](https://img.shields.io/npm/v/remesh-threejs.svg)](https://www.npmjs.com/package/remesh-threejs)
[![npm downloads](https://img.shields.io/npm/dm/remesh-threejs.svg)](https://www.npmjs.com/package/remesh-threejs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/RossGraeber/remesh-threejs/workflows/CI/badge.svg)](https://github.com/RossGraeber/remesh-threejs/actions)

TypeScript library for reapir and remeshing of non-manifold surfaces using Three.js.

Based on the EUROGRAPHICS 2008 paper ["Adaptive Remeshing of Non-Manifold Surfaces"](https://doi.org/10.1111/j.1467-8659.2008.01285.x) by Zilske, Lamecker, and Zachow.

## Features

- **Non-manifold mesh support**: Extended halfedge data structure supporting edges with more than 2 incident faces
- **Feature skeleton**: Unified treatment of non-manifold edges, feature lines, and boundary edges
- **Adaptive remeshing**: Edge splitting, contraction, flipping, and vertex smoothing
- **Fast mesh repair**: Targeted repair operations 10-100x faster than full remeshing
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

### Fast Mesh Repair

```typescript
import { repairMesh, removeIsolatedVertices } from 'remesh-threejs';

// Quick repair (removes isolated vertices, degenerate faces, duplicates)
const result = repairMesh(geometry);
console.log(`Fixed ${result.stats.totalDefectsFixed} defects in ${result.stats.totalTimeMs}ms`);

// Targeted repairs (10-100x faster than full remeshing)
const result2 = removeIsolatedVertices(geometry);
const result3 = removeDegenerateFaces(geometry, { areaThreshold: 1e-10 });
const result4 = removeDuplicateFaces(geometry);
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
| `repairMesh(geometry, options?)` | Fast repair for common defects |
| `removeIsolatedVertices(geometry)` | Remove orphaned vertices with no faces |
| `removeDegenerateFaces(geometry, options?)` | Remove zero-area triangles |
| `removeDuplicateFaces(geometry)` | Remove faces with identical vertices |
| `analyzeManifold(geometry)` | Analyze mesh for non-manifold features |
| `isManifold(geometry)` | Quick check if mesh is manifold |
| `validateTopology(mesh)` | Validate mesh topology integrity |

### Core Classes

| Class | Description |
|-------|-------------|
| `NonManifoldMesh` | Main mesh data structure with halfedge connectivity |
| `AdaptiveRemesher` | Iterative remeshing algorithm |
| `MeshRepairer` | Composable mesh repair operations |
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

### Mesh Repair API

Fast, targeted repairs for common mesh defects. These operations are **10-100x faster** than full remeshing when you only need to fix specific issues.

#### Functional API (Simple)

```typescript
import {
  repairMesh,
  removeIsolatedVertices,
  removeDegenerateFaces,
  removeDuplicateFaces,
} from 'remesh-threejs';

// Run all repairs in optimal order
const result = repairMesh(geometry);
console.log(`Fixed ${result.stats.totalDefectsFixed} defects`);

// Or use targeted repairs
const result2 = removeIsolatedVertices(geometry);        // 100x+ faster
const result3 = removeDegenerateFaces(geometry);         // 50-100x faster
const result4 = removeDuplicateFaces(geometry);          // 30-60x faster
```

#### Class-Based API (Advanced)

```typescript
import { MeshRepairer } from 'remesh-threejs';

// Compose multiple repairs with chaining
const repairer = new MeshRepairer(geometry, {
  verbose: true,           // Enable logging
  validateAfterEach: true, // Validate topology after each operation
});

const stats = repairer
  .removeIsolatedVertices()
  .removeDegenerateFaces()
  .removeDuplicateFaces()
  .execute();

const repairedGeometry = repairer.toBufferGeometry();

// Validate results
const validation = repairer.validate();
if (!validation.isValid) {
  console.error('Topology errors:', validation.errors);
}
```

#### Common Defects Repaired

| Defect | Operation | Speedup vs Remesh |
|--------|-----------|-------------------|
| Orphaned vertices | `removeIsolatedVertices()` | 100x+ |
| Zero-area triangles | `removeDegenerateFaces()` | 50-100x |
| Duplicate faces | `removeDuplicateFaces()` | 30-60x |

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

### Remesh Options

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

### Repair Options

```typescript
interface RepairOptions {
  // Use Web Workers for parallel processing (default: auto for large meshes)
  useWorkers?: boolean;

  // Number of worker threads (default: navigator.hardwareConcurrency || 4)
  workerCount?: number;

  // Use spatial acceleration structures (default: true)
  useAcceleration?: boolean;

  // Minimum mesh size to trigger parallelization (default: 10000 faces)
  parallelThreshold?: number;

  // Enable verbose logging (default: false)
  verbose?: boolean;

  // Validate topology after each operation (default: false)
  validateAfterEach?: boolean;
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

## Publishing

See [PUBLISHING.md](PUBLISHING.md) for detailed instructions on publishing new versions to npm.

### Quick Publish Steps

1. Update version: `npm version patch|minor|major`
2. Push: `git push && git push --tags`
3. Create GitHub release
4. Automated CI/CD publishes to npm

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
