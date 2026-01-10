/**
 * remesh-threejs
 *
 * TypeScript library for adaptive remeshing of non-manifold surfaces using Three.js.
 * Based on the EUROGRAPHICS 2008 paper "Adaptive Remeshing of Non-Manifold Surfaces"
 * by Zilske, Lamecker, and Zachow.
 *
 * @packageDocumentation
 */

// Types
export type {
  VertexId,
  EdgeId,
  HalfedgeId,
  FaceId,
  SegmentId,
  FeatureEdge,
  RemeshOptions,
  RemeshStats,
  RemeshResult,
} from './types';

export {
  createVertexId,
  createEdgeId,
  createHalfedgeId,
  createFaceId,
  createSegmentId,
  toNumber,
  VertexType,
  EdgeType,
  canMoveFreely,
  isSkeletonConstrained,
  isPositionFixed,
  isSkeletonEdge,
  canFlipEdge,
  DEFAULT_REMESH_OPTIONS,
} from './types';

// Core data structures
export {
  Vertex,
  Edge,
  Halfedge,
  Face,
  NonManifoldMesh,
  FeatureSkeleton,
  createSkeleton,
} from './core';

// Skeleton utilities
export type { SkeletonBuildResult, ConstrainedPosition } from './skeleton';

export {
  SkeletonSegment,
  SkeletonBuilder,
  buildSkeleton,
  SkeletonConstraints,
  createSkeletonConstraints,
} from './skeleton';

// I/O utilities
export type { ImportOptions, ValidationResult, ExportOptions } from './io';

export {
  validateGeometry,
  importBufferGeometry,
  BufferGeometryImporter,
  exportBufferGeometry,
  exportSkeletonGeometry,
  exportClassificationGeometry,
  exportQualityGeometry,
  BufferGeometryExporter,
} from './io';

// Geometry utilities
export type { Vec3 } from './geometry';

export {
  distance,
  distanceSquared,
  dot,
  cross,
  length,
  lengthSquared,
  normalize,
  add,
  subtract,
  scale,
  lerp,
  midpoint,
  angleBetween,
  projectPointOnLine,
  projectPointOnSegment,
  triangleArea,
  triangleNormal,
  triangleCentroid,
  triangleCircumcenter,
  triangleCircumradius,
  triangleInradius,
  triangleQuality,
  isPointInTriangle,
  barycentricCoordinates,
  isQuadConvex,
  fromVector3,
  cotangent,
  angleAtVertex,
} from './geometry';

// Spatial acceleration structures
export type { AABB, Triangle, ClosestPointResult } from './spatial';

export { SpatialHash, createSpatialHash, BVH, createBVHFromMesh } from './spatial';

// Analysis utilities
export type {
  NonManifoldEdgeInfo,
  NonManifoldVertexInfo,
  ManifoldAnalysisResult,
  ClassificationStats,
  ValidationError,
  TopologyValidationResult,
} from './analysis';

export {
  analyzeManifold,
  analyzeMesh,
  isManifold,
  ManifoldAnalyzer,
  classifyAllVertices,
  classifyVertex,
  getVerticesByType,
  getManifoldVertices,
  getOpenBookVertices,
  getSkeletonBranchingVertices,
  getNonManifoldVertices,
  reclassifyVertices,
  VertexClassifier,
  validateTopology,
  isTopologyValid,
  TopologyValidator,
} from './analysis';

// Mesh operations
export type {
  EdgeFlipResult,
  EdgeSplitResult,
  EdgeContractionResult,
  VertexRelocationResult,
} from './operations';

export {
  canFlipEdge as canFlipEdgeGeometric,
  flipEdge,
  isDelaunay,
  makeDelaunay,
  EdgeFlipper,
  splitEdge,
  splitLongEdges,
  EdgeSplitter,
  canContractEdge,
  contractEdge,
  contractShortEdges,
  EdgeContractor,
  computeTangentialSmoothing,
  relocateVertex,
  smoothVertex,
  smoothAllVertices,
  VertexRelocator,
} from './operations';

// Algorithms
export type { MeshQualityStats } from './algorithms';

export {
  computeMeshQuality,
  getPoorQualityFaces,
  getLongEdges,
  getShortEdges,
  computeTargetEdgeLength,
  computeTriangleAspectRatio,
  getHighValenceVertices,
  getLowValenceVertices,
  QualityMetrics,
  AdaptiveRemesher,
  remesh,
  createRemesher,
} from './algorithms';
