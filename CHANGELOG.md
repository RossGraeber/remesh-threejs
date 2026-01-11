# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of adaptive remeshing for non-manifold surfaces
- Extended halfedge data structure supporting edges with >2 incident faces
- Feature skeleton system for unified treatment of non-manifold edges, feature lines, and boundaries
- Vertex classification system (Manifold, OpenBook, SkeletonBranching, NonManifoldOther)
- Edge classification system (Manifold, NonManifold, Feature, Boundary)
- Mesh operations: edge splitting, contraction, flipping, and vertex smoothing
- **Fast mesh repair API** - Targeted repairs 10-100x faster than full remeshing
  - `repairMesh()` - One-shot repair for all common defects
  - `removeIsolatedVertices()` - Remove orphaned vertices (100x+ faster)
  - `removeDegenerateFaces()` - Remove zero-area triangles (50-100x faster)
  - `removeDuplicateFaces()` - Remove duplicate faces (30-60x faster)
  - `MeshRepairer` class for composable repairs with chaining
  - Functional and class-based APIs
- Analysis tools: `ManifoldAnalyzer`, `VertexClassifier`, `TopologyValidator`
- Spatial acceleration structures: `SpatialHash` and `BVH` for large mesh support (500K+ triangles)
- Quality metrics and triangle quality analysis
- Three.js BufferGeometry import/export
- Visualization helpers for skeleton, classification, and quality
- Comprehensive test suite with 204 tests (22 new repair tests)
- Full TypeScript support with type declarations
- Dual ES module and CommonJS builds

### Documentation
- Complete API documentation in README
- Quick start examples for basic and advanced usage
- Publishing guide for npm
- Development setup instructions

## [0.1.0] - YYYY-MM-DD

### Added
- Initial release

[Unreleased]: https://github.com/RossGraeber/remesh-threejs/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/RossGraeber/remesh-threejs/releases/tag/v0.1.0
