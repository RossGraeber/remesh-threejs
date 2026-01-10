/**
 * Type definitions for remesh-threejs.
 */

export type { VertexId, EdgeId, HalfedgeId, FaceId, SegmentId } from './MeshData';

export {
  createVertexId,
  createEdgeId,
  createHalfedgeId,
  createFaceId,
  createSegmentId,
  toNumber,
} from './MeshData';

export { VertexType, EdgeType } from './SkeletonData';

export {
  canMoveFreely,
  isSkeletonConstrained,
  isPositionFixed,
  isSkeletonEdge,
  canFlipEdge,
} from './SkeletonData';

export type { FeatureEdge, RemeshOptions, RemeshStats, RemeshResult } from './RemeshOptions';

export { DEFAULT_REMESH_OPTIONS } from './RemeshOptions';
