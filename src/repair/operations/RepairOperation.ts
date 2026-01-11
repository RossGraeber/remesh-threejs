import type { NonManifoldMesh } from '../../core/NonManifoldMesh';
import type { OperationStats } from '../RepairStats';

/**
 * Base class for all repair operations.
 */
export abstract class RepairOperation {
  protected mesh: NonManifoldMesh;
  protected verbose: boolean;

  constructor(mesh: NonManifoldMesh, verbose: boolean = false) {
    this.mesh = mesh;
    this.verbose = verbose;
  }

  /**
   * Detect defects in the mesh.
   * @returns Number of defects found
   */
  abstract detect(): number;

  /**
   * Repair the detected defects.
   * @returns Number of defects fixed
   */
  abstract repair(): number;

  /**
   * Execute the operation (detect + repair).
   * @returns Operation statistics
   */
  execute(): OperationStats {
    const startTime = performance.now();
    const defectsFound = this.detect();

    if (defectsFound === 0) {
      return {
        operation: this.getName(),
        defectsFound: 0,
        defectsFixed: 0,
        timeMs: performance.now() - startTime,
        success: true,
      };
    }

    const defectsFixed = this.repair();
    const timeMs = performance.now() - startTime;

    const result: OperationStats = {
      operation: this.getName(),
      defectsFound,
      defectsFixed,
      timeMs,
      success: defectsFixed === defectsFound,
    };

    if (defectsFixed < defectsFound) {
      result.reason = `Only fixed ${defectsFixed}/${defectsFound} defects`;
    }

    return result;
  }

  /**
   * Get the name of this operation.
   */
  abstract getName(): string;

  /**
   * Check if this operation can be parallelized.
   */
  abstract canParallelize(): boolean;
}
