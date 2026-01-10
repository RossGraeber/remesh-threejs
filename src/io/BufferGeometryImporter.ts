import type { BufferGeometry } from 'three';
import { NonManifoldMesh } from '../core/NonManifoldMesh';
import type { FeatureEdge } from '../types/RemeshOptions';

/**
 * Options for importing a BufferGeometry.
 */
export interface ImportOptions {
  /**
   * User-defined feature edges to preserve.
   * Each edge is specified as a pair of vertex indices.
   */
  featureEdges?: FeatureEdge[];

  /**
   * Whether to validate the geometry before importing.
   * @default true
   */
  validate?: boolean;

  /**
   * Whether to merge duplicate vertices.
   * @default false
   */
  mergeVertices?: boolean;

  /**
   * Tolerance for merging vertices.
   * @default 1e-6
   */
  mergeTolerance?: number;
}

/**
 * Result of geometry validation.
 */
export interface ValidationResult {
  /** Whether the geometry is valid */
  isValid: boolean;

  /** List of validation errors */
  errors: string[];

  /** List of validation warnings */
  warnings: string[];
}

/**
 * Validates a BufferGeometry for import.
 *
 * @param geometry - The geometry to validate
 * @returns Validation result with errors and warnings
 */
export function validateGeometry(geometry: BufferGeometry): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for position attribute
  const positions = geometry.attributes['position'];
  if (!positions) {
    errors.push('Geometry must have a position attribute');
    return { isValid: false, errors, warnings };
  }

  // Check for index
  const indices = geometry.index;
  if (!indices) {
    errors.push('Geometry must be indexed');
    return { isValid: false, errors, warnings };
  }

  // Check that indices form triangles
  if (indices.count % 3 !== 0) {
    errors.push(`Index count (${indices.count}) must be divisible by 3 for triangle mesh`);
  }

  // Check for invalid indices
  const numVertices = positions.count;
  for (let i = 0; i < indices.count; i++) {
    const index = indices.getX(i);
    if (index < 0 || index >= numVertices) {
      errors.push(`Invalid index ${index} at position ${i} (vertex count: ${numVertices})`);
      break; // Only report first invalid index
    }
  }

  // Check for degenerate triangles
  let degenerateCount = 0;
  const numFaces = indices.count / 3;
  for (let i = 0; i < numFaces; i++) {
    const i0 = indices.getX(i * 3);
    const i1 = indices.getX(i * 3 + 1);
    const i2 = indices.getX(i * 3 + 2);

    if (i0 === i1 || i1 === i2 || i2 === i0) {
      degenerateCount++;
    }
  }
  if (degenerateCount > 0) {
    warnings.push(`Found ${degenerateCount} degenerate triangle(s) with repeated vertices`);
  }

  // Check for NaN/Infinity in positions
  let invalidPositionCount = 0;
  for (let i = 0; i < numVertices; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
      invalidPositionCount++;
    }
  }
  if (invalidPositionCount > 0) {
    errors.push(`Found ${invalidPositionCount} vertex position(s) with NaN or Infinity values`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Imports a Three.js BufferGeometry into a NonManifoldMesh.
 *
 * @param geometry - The input geometry
 * @param options - Import options
 * @returns The imported mesh
 * @throws Error if geometry is invalid and validation is enabled
 */
export function importBufferGeometry(
  geometry: BufferGeometry,
  options: ImportOptions = {}
): NonManifoldMesh {
  const { featureEdges, validate = true } = options;

  // Validate geometry
  if (validate) {
    const validation = validateGeometry(geometry);
    if (!validation.isValid) {
      throw new Error(`Invalid geometry: ${validation.errors.join('; ')}`);
    }
  }

  // Import using NonManifoldMesh factory method
  return NonManifoldMesh.fromBufferGeometry(geometry, featureEdges);
}

/**
 * Utility class for importing BufferGeometry with additional features.
 */
export class BufferGeometryImporter {
  private options: ImportOptions;

  constructor(options: ImportOptions = {}) {
    this.options = options;
  }

  /**
   * Imports a BufferGeometry into a NonManifoldMesh.
   */
  import(geometry: BufferGeometry): NonManifoldMesh {
    return importBufferGeometry(geometry, this.options);
  }

  /**
   * Validates a BufferGeometry without importing.
   */
  validate(geometry: BufferGeometry): ValidationResult {
    return validateGeometry(geometry);
  }

  /**
   * Sets feature edges to preserve during remeshing.
   */
  setFeatureEdges(edges: FeatureEdge[]): this {
    this.options.featureEdges = edges;
    return this;
  }

  /**
   * Enables or disables validation.
   */
  setValidation(enabled: boolean): this {
    this.options.validate = enabled;
    return this;
  }
}
