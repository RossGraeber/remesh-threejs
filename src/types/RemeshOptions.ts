/**
 * Configuration options for the adaptive remeshing algorithm.
 */

/**
 * Feature edge specification as a pair of vertex indices.
 */
export type FeatureEdge = [number, number];

/**
 * Options for the adaptive remeshing algorithm.
 */
export interface RemeshOptions {
  /**
   * Number of remeshing iterations to perform.
   * More iterations generally produce higher quality results.
   * @default 5
   */
  iterations?: number;

  /**
   * Target edge length for the remeshed surface.
   * If not specified, computed automatically based on mesh bounding box.
   */
  targetEdgeLength?: number;

  /**
   * User-defined feature edges that should be preserved.
   * Each edge is specified as a pair of vertex indices from the input geometry.
   * These edges will be included in the feature skeleton.
   */
  featureEdges?: FeatureEdge[];

  /**
   * Whether to preserve boundary edges.
   * When true, boundary edges are included in the skeleton and preserved.
   * @default true
   */
  preserveBoundary?: boolean;

  /**
   * Minimum allowed edge length as a fraction of targetEdgeLength.
   * Edges shorter than this will be collapsed.
   * @default 0.4
   */
  minEdgeLengthRatio?: number;

  /**
   * Maximum allowed edge length as a fraction of targetEdgeLength.
   * Edges longer than this will be split.
   * @default 1.333
   */
  maxEdgeLengthRatio?: number;

  /**
   * Minimum allowed triangle quality (0 to 1).
   * Triangles with quality below this threshold are prioritized for improvement.
   * Quality is measured as the ratio of inscribed to circumscribed circle radii.
   * @default 0.3
   */
  minTriangleQuality?: number;

  /**
   * Maximum angle deviation from original surface (in radians).
   * Vertices are not relocated if it would cause normals to deviate more than this.
   * @default Math.PI / 6 (30 degrees)
   */
  maxNormalDeviation?: number;

  /**
   * Use spatial acceleration structures for large meshes.
   * Recommended for meshes with more than 50K triangles.
   * @default true
   */
  useAcceleration?: boolean;

  /**
   * Process mesh in chunks of this size.
   * Set to 0 to disable chunking.
   * Useful for very large meshes to manage memory usage.
   * @default 0
   */
  chunkSize?: number;

  /**
   * Maximum memory budget in MB.
   * Set to 0 for unlimited.
   * When exceeded, algorithm will attempt to reduce memory usage.
   * @default 0
   */
  memoryBudget?: number;

  /**
   * Enable verbose logging during remeshing.
   * @default false
   */
  verbose?: boolean;
}

/**
 * Statistics returned after remeshing completes.
 */
export interface RemeshStats {
  /** Number of vertices in the input mesh */
  inputVertices: number;

  /** Number of faces in the input mesh */
  inputFaces: number;

  /** Number of vertices in the output mesh */
  outputVertices: number;

  /** Number of faces in the output mesh */
  outputFaces: number;

  /** Number of iterations performed */
  iterations: number;

  /** Final average triangle quality (0 to 1) */
  finalQuality: number;

  /** Number of non-manifold edges detected */
  nonManifoldEdges: number;

  /** Number of skeleton edges (non-manifold + feature + boundary) */
  skeletonEdges: number;

  /** Number of edge flips performed */
  edgeFlips: number;

  /** Number of edge splits performed */
  edgeSplits: number;

  /** Number of edge contractions performed */
  edgeContractions: number;

  /** Number of vertex relocations performed */
  vertexRelocations: number;

  /** Total processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Result of the remeshing operation.
 */
export interface RemeshResult {
  /** Statistics about the remeshing operation */
  stats: RemeshStats;
}

/**
 * Default remeshing options.
 */
export const DEFAULT_REMESH_OPTIONS: Required<
  Omit<RemeshOptions, 'targetEdgeLength' | 'featureEdges'>
> = {
  iterations: 5,
  preserveBoundary: true,
  minEdgeLengthRatio: 0.4,
  maxEdgeLengthRatio: 1.333,
  minTriangleQuality: 0.3,
  maxNormalDeviation: Math.PI / 6,
  useAcceleration: true,
  chunkSize: 0,
  memoryBudget: 0,
  verbose: false,
};
