/**
 * Branded types for mesh elements to ensure type safety.
 * These prevent accidentally mixing up different ID types.
 */

/**
 * Unique identifier for a vertex in the mesh.
 */
export type VertexId = number & { readonly __brand: 'VertexId' };

/**
 * Unique identifier for an edge in the mesh.
 */
export type EdgeId = number & { readonly __brand: 'EdgeId' };

/**
 * Unique identifier for a halfedge in the mesh.
 */
export type HalfedgeId = number & { readonly __brand: 'HalfedgeId' };

/**
 * Unique identifier for a face in the mesh.
 */
export type FaceId = number & { readonly __brand: 'FaceId' };

/**
 * Unique identifier for a skeleton segment.
 */
export type SegmentId = number & { readonly __brand: 'SegmentId' };

/**
 * Creates a branded VertexId from a number.
 */
export function createVertexId(id: number): VertexId {
  return id as VertexId;
}

/**
 * Creates a branded EdgeId from a number.
 */
export function createEdgeId(id: number): EdgeId {
  return id as EdgeId;
}

/**
 * Creates a branded HalfedgeId from a number.
 */
export function createHalfedgeId(id: number): HalfedgeId {
  return id as HalfedgeId;
}

/**
 * Creates a branded FaceId from a number.
 */
export function createFaceId(id: number): FaceId {
  return id as FaceId;
}

/**
 * Creates a branded SegmentId from a number.
 */
export function createSegmentId(id: number): SegmentId {
  return id as SegmentId;
}

/**
 * Extracts the numeric value from a branded ID.
 */
export function toNumber(id: VertexId | EdgeId | HalfedgeId | FaceId | SegmentId): number {
  return id as number;
}
