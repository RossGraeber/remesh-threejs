import type { BufferGeometry } from 'three';

/**
 * Options for mesh repair operations.
 */
export interface RepairOptions {
  /** Use Web Workers for parallel processing (default: true for large meshes) */
  useWorkers?: boolean;

  /** Number of worker threads (default: navigator.hardwareConcurrency || 4) */
  workerCount?: number;

  /** Use spatial acceleration structures (default: true) */
  useAcceleration?: boolean;

  /** Minimum mesh size to trigger parallelization (default: 10000 faces) */
  parallelThreshold?: number;

  /** Enable verbose logging (default: false) */
  verbose?: boolean;

  /** Validate topology after each operation (default: false) */
  validateAfterEach?: boolean;
}

/**
 * Statistics for a single repair operation.
 */
export interface OperationStats {
  /** Name of the operation */
  operation: string;

  /** Number of defects found */
  defectsFound: number;

  /** Number of defects fixed */
  defectsFixed: number;

  /** Processing time in milliseconds */
  timeMs: number;

  /** Whether the operation succeeded */
  success: boolean;

  /** Reason for failure (if any) */
  reason?: string;
}

/**
 * Overall repair statistics.
 */
export interface RepairStats {
  /** Input mesh statistics */
  input: {
    vertices: number;
    faces: number;
    edges: number;
  };

  /** Output mesh statistics */
  output: {
    vertices: number;
    faces: number;
    edges: number;
  };

  /** Statistics for each operation performed */
  operations: OperationStats[];

  /** Total processing time in milliseconds */
  totalTimeMs: number;

  /** Whether all operations succeeded */
  success: boolean;

  /** Total defects found */
  totalDefectsFound: number;

  /** Total defects fixed */
  totalDefectsFixed: number;
}

/**
 * Result of a repair operation.
 */
export interface RepairResult {
  /** The repaired geometry */
  geometry: BufferGeometry;

  /** Repair statistics */
  stats: RepairStats;
}

/**
 * Defect information for analysis.
 */
export interface DefectInfo {
  type:
    | 'non-manifold'
    | 'hole'
    | 'degenerate'
    | 'intersection'
    | 'isolated'
    | 'duplicate'
    | 'normal';
  count: number;
  locations: { faceIndex?: number; vertexIndex?: number; edgeIndex?: number }[];
}
