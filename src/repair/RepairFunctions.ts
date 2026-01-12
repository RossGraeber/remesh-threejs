import type { BufferGeometry } from 'three';
import type { RepairOptions, RepairResult } from './RepairStats';
import { MeshRepairer } from './MeshRepairer';
import type { NonManifoldRepairStrategy } from './operations/NonManifoldEdgeRepair';

/**
 * Repair a mesh by applying all repair operations in optimal order.
 * Fast alternative to full remeshing for common defects.
 *
 * @param geometry - Input BufferGeometry
 * @param options - Repair options
 * @returns Repaired geometry and statistics
 */
export function repairMesh(geometry: BufferGeometry, options?: RepairOptions): RepairResult {
  const repairer = new MeshRepairer(geometry, options);
  const stats = repairer.repairAll().execute();

  return {
    geometry: repairer.toBufferGeometry(),
    stats,
  };
}

/**
 * Remove isolated vertices (vertices with no incident faces).
 *
 * @param geometry - Input BufferGeometry
 * @param options - Repair options
 * @returns Repaired geometry and statistics
 */
export function removeIsolatedVertices(
  geometry: BufferGeometry,
  options?: RepairOptions
): RepairResult {
  const repairer = new MeshRepairer(geometry, options);
  const stats = repairer.removeIsolatedVertices().execute();

  return {
    geometry: repairer.toBufferGeometry(),
    stats,
  };
}

/**
 * Remove degenerate faces (zero area, duplicate vertices).
 *
 * @param geometry - Input BufferGeometry
 * @param options - Repair options with optional areaThreshold
 * @returns Repaired geometry and statistics
 */
export function removeDegenerateFaces(
  geometry: BufferGeometry,
  options?: RepairOptions & { areaThreshold?: number }
): RepairResult {
  const repairer = new MeshRepairer(geometry, options);
  const stats = repairer.removeDegenerateFaces(options?.areaThreshold).execute();

  return {
    geometry: repairer.toBufferGeometry(),
    stats,
  };
}

/**
 * Remove duplicate faces with identical vertices.
 *
 * @param geometry - Input BufferGeometry
 * @param options - Repair options
 * @returns Repaired geometry and statistics
 */
export function removeDuplicateFaces(
  geometry: BufferGeometry,
  options?: RepairOptions
): RepairResult {
  const repairer = new MeshRepairer(geometry, options);
  const stats = repairer.removeDuplicateFaces().execute();

  return {
    geometry: repairer.toBufferGeometry(),
    stats,
  };
}

/**
 * Remove non-manifold edges by splitting or collapsing.
 *
 * @param geometry - Input BufferGeometry
 * @param options - Repair options with optional strategy
 * @returns Repaired geometry and statistics
 */
export function removeNonManifoldEdges(
  geometry: BufferGeometry,
  options?: RepairOptions & { strategy?: NonManifoldRepairStrategy }
): RepairResult {
  const repairer = new MeshRepairer(geometry, options);
  const stats = repairer.removeNonManifoldEdges(options?.strategy).execute();

  return {
    geometry: repairer.toBufferGeometry(),
    stats,
  };
}

/**
 * Fill holes in the mesh by triangulating boundary loops.
 *
 * @param geometry - Input BufferGeometry
 * @param options - Repair options with optional maxHoleSize
 * @returns Repaired geometry and statistics
 */
export function fillHoles(
  geometry: BufferGeometry,
  options?: RepairOptions & { maxHoleSize?: number }
): RepairResult {
  const repairer = new MeshRepairer(geometry, options);
  const stats = repairer.fillHoles(options?.maxHoleSize).execute();

  return {
    geometry: repairer.toBufferGeometry(),
    stats,
  };
}

/**
 * Unify face orientations to make normals consistent.
 *
 * @param geometry - Input BufferGeometry
 * @param options - Repair options with optional seedFaceIndex
 * @returns Repaired geometry and statistics
 */
export function unifyNormals(
  geometry: BufferGeometry,
  options?: RepairOptions & { seedFaceIndex?: number }
): RepairResult {
  const repairer = new MeshRepairer(geometry, options);
  const stats = repairer.unifyNormals(options?.seedFaceIndex).execute();

  return {
    geometry: repairer.toBufferGeometry(),
    stats,
  };
}
