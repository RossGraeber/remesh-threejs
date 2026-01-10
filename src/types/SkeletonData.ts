/**
 * Classification types for vertices and edges in non-manifold meshes.
 * Based on the EUROGRAPHICS 2008 paper "Adaptive Remeshing of Non-Manifold Surfaces".
 */

/**
 * Classification of a vertex based on its neighborhood topology.
 *
 * - Manifold: Star homeomorphic to disk, can move freely in 3D
 * - OpenBook: On exactly 2 skeleton edges (like pages of a book), constrained to skeleton
 * - SkeletonBranching: On 1 or >2 skeleton edges, position is fixed
 * - NonManifoldOther: Other non-manifold configurations, position is fixed
 */
export enum VertexType {
  /** Vertex with manifold neighborhood - can move freely in 3D */
  Manifold = 'manifold',

  /** Vertex on exactly 2 skeleton edges (open-book) - constrained to skeleton segment */
  OpenBook = 'open_book',

  /** Vertex on 1 or >2 skeleton edges - position is fixed */
  SkeletonBranching = 'skeleton_branching',

  /** Other non-manifold vertex type - position is fixed */
  NonManifoldOther = 'non_manifold_other',
}

/**
 * Classification of an edge based on its incident faces.
 *
 * - Manifold: Exactly 2 incident faces
 * - NonManifold: More than 2 incident faces (seam edge)
 * - Feature: User-defined feature edge that should be preserved
 * - Boundary: Only 1 incident face (mesh boundary)
 */
export enum EdgeType {
  /** Edge with exactly 2 incident faces - standard manifold edge */
  Manifold = 'manifold',

  /** Edge with more than 2 incident faces - non-manifold seam */
  NonManifold = 'non_manifold',

  /** User-defined feature edge that should be preserved */
  Feature = 'feature',

  /** Edge with only 1 incident face - boundary edge */
  Boundary = 'boundary',
}

/**
 * Determines if a vertex type allows free movement in 3D space.
 */
export function canMoveFreely(type: VertexType): boolean {
  return type === VertexType.Manifold;
}

/**
 * Determines if a vertex type is constrained to a skeleton segment.
 */
export function isSkeletonConstrained(type: VertexType): boolean {
  return type === VertexType.OpenBook;
}

/**
 * Determines if a vertex type has a fixed position.
 */
export function isPositionFixed(type: VertexType): boolean {
  return type === VertexType.SkeletonBranching || type === VertexType.NonManifoldOther;
}

/**
 * Determines if an edge type is part of the feature skeleton.
 */
export function isSkeletonEdge(type: EdgeType): boolean {
  return type === EdgeType.NonManifold || type === EdgeType.Feature || type === EdgeType.Boundary;
}

/**
 * Determines if an edge can be flipped (only manifold edges can be flipped).
 */
export function canFlipEdge(type: EdgeType): boolean {
  return type === EdgeType.Manifold;
}
