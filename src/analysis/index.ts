/**
 * Analysis utilities for mesh topology and manifoldness.
 */

export type {
  NonManifoldEdgeInfo,
  NonManifoldVertexInfo,
  ManifoldAnalysisResult,
} from './ManifoldAnalyzer';

export { analyzeManifold, analyzeMesh, isManifold, ManifoldAnalyzer } from './ManifoldAnalyzer';

export type { ClassificationStats } from './VertexClassifier';

export {
  classifyAllVertices,
  classifyVertex,
  getVerticesByType,
  getManifoldVertices,
  getOpenBookVertices,
  getSkeletonBranchingVertices,
  getNonManifoldVertices,
  reclassifyVertices,
  VertexClassifier,
} from './VertexClassifier';

export type { ValidationError, TopologyValidationResult } from './TopologyValidator';

export { validateTopology, isTopologyValid, TopologyValidator } from './TopologyValidator';
