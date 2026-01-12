import type { BufferGeometry } from 'three';
import { NonManifoldMesh } from '../core/NonManifoldMesh';
import { validateTopology } from '../analysis/TopologyValidator';
import { exportBufferGeometry } from '../io/BufferGeometryExporter';
import type { RepairOptions, RepairStats } from './RepairStats';
import type { RepairOperation } from './operations/RepairOperation';
import { IsolatedVertexRepair } from './operations/IsolatedVertexRepair';
import { DegenerateFaceRepair } from './operations/DegenerateFaceRepair';
import { DuplicateFaceRepair } from './operations/DuplicateFaceRepair';
import {
  NonManifoldEdgeRepair,
  type NonManifoldRepairStrategy,
} from './operations/NonManifoldEdgeRepair';
import { HoleFiller } from './operations/HoleFiller';
import { NormalUnifier } from './operations/NormalUnifier';

/**
 * Advanced mesh repair with fine-grained control and composition.
 */
export class MeshRepairer {
  private mesh: NonManifoldMesh;
  private options: Required<RepairOptions>;
  private operations: RepairOperation[] = [];
  private stats: RepairStats;

  constructor(meshOrGeometry: NonManifoldMesh | BufferGeometry, options?: RepairOptions) {
    // Convert BufferGeometry to NonManifoldMesh if needed
    if (meshOrGeometry instanceof NonManifoldMesh) {
      this.mesh = meshOrGeometry;
    } else {
      this.mesh = NonManifoldMesh.fromBufferGeometry(meshOrGeometry);
    }

    // Set default options
    this.options = {
      useWorkers:
        options?.useWorkers ??
        (typeof navigator !== 'undefined' &&
          this.mesh.faces.size > (options?.parallelThreshold ?? 10000)),
      workerCount:
        options?.workerCount ??
        (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4),
      useAcceleration: options?.useAcceleration ?? true,
      parallelThreshold: options?.parallelThreshold ?? 10000,
      verbose: options?.verbose ?? false,
      validateAfterEach: options?.validateAfterEach ?? false,
    };

    // Initialize stats
    this.stats = {
      input: {
        vertices: this.mesh.vertices.size,
        faces: this.mesh.faces.size,
        edges: this.mesh.edges.size,
      },
      output: {
        vertices: this.mesh.vertices.size,
        faces: this.mesh.faces.size,
        edges: this.mesh.edges.size,
      },
      operations: [],
      totalTimeMs: 0,
      success: true,
      totalDefectsFound: 0,
      totalDefectsFixed: 0,
    };
  }

  /**
   * Remove isolated vertices (vertices with no faces).
   * @returns this for chaining
   */
  removeIsolatedVertices(): this {
    this.operations.push(new IsolatedVertexRepair(this.mesh, this.options.verbose));
    return this;
  }

  /**
   * Remove zero-area and degenerate triangles.
   * @param areaThreshold - Minimum area threshold (default: 1e-10)
   * @returns this for chaining
   */
  removeDegenerateFaces(areaThreshold?: number): this {
    this.operations.push(new DegenerateFaceRepair(this.mesh, this.options.verbose, areaThreshold));
    return this;
  }

  /**
   * Remove duplicate faces with identical vertices.
   * @returns this for chaining
   */
  removeDuplicateFaces(): this {
    this.operations.push(new DuplicateFaceRepair(this.mesh, this.options.verbose));
    return this;
  }

  /**
   * Remove non-manifold edges by splitting or collapsing.
   * @param strategy - Repair strategy: 'split', 'collapse', or 'auto' (default: 'auto')
   * @returns this for chaining
   */
  removeNonManifoldEdges(strategy?: NonManifoldRepairStrategy): this {
    this.operations.push(new NonManifoldEdgeRepair(this.mesh, this.options.verbose, strategy));
    return this;
  }

  /**
   * Fill boundary loops (holes) with triangulation.
   * @param maxHoleSize - Maximum number of edges in a hole to fill (default: 100)
   * @returns this for chaining
   */
  fillHoles(maxHoleSize?: number): this {
    this.operations.push(new HoleFiller(this.mesh, this.options.verbose, maxHoleSize));
    return this;
  }

  /**
   * Unify face orientations to make normals consistent.
   * @param seedFaceIndex - Index of the face to use as orientation reference (default: 0)
   * @returns this for chaining
   */
  unifyNormals(seedFaceIndex?: number): this {
    this.operations.push(new NormalUnifier(this.mesh, this.options.verbose, seedFaceIndex));
    return this;
  }

  /**
   * Run all common repairs in optimal order.
   * @returns this for chaining
   */
  repairAll(): this {
    // Optimal order: isolated vertices -> duplicates -> degenerates -> holes -> normals
    this.removeIsolatedVertices();
    this.removeDuplicateFaces();
    this.removeDegenerateFaces();
    this.fillHoles();
    this.unifyNormals();
    return this;
  }

  /**
   * Execute all queued operations.
   * @returns Repair statistics
   */
  execute(): RepairStats {
    const startTime = performance.now();
    this.stats.operations = [];
    this.stats.totalDefectsFound = 0;
    this.stats.totalDefectsFixed = 0;
    this.stats.success = true;

    for (const operation of this.operations) {
      const opStats = operation.execute();
      this.stats.operations.push(opStats);
      this.stats.totalDefectsFound += opStats.defectsFound;
      this.stats.totalDefectsFixed += opStats.defectsFixed;

      if (!opStats.success) {
        this.stats.success = false;
      }

      // Validate after each operation if requested
      if (this.options.validateAfterEach) {
        const validation = validateTopology(this.mesh);
        if (!validation.isValid) {
          const errors = [...validation.errors, ...validation.warnings];
          console.warn(`Topology validation failed after ${opStats.operation}:`, errors);
          this.stats.success = false;
        }
      }
    }

    this.stats.totalTimeMs = performance.now() - startTime;

    // Update output stats
    this.stats.output = {
      vertices: this.mesh.vertices.size,
      faces: this.mesh.faces.size,
      edges: this.mesh.edges.size,
    };

    // Clear operations queue
    this.operations = [];

    return this.stats;
  }

  /**
   * Get current statistics.
   */
  getStats(): RepairStats {
    return this.stats;
  }

  /**
   * Get the repaired mesh.
   */
  getMesh(): NonManifoldMesh {
    return this.mesh;
  }

  /**
   * Export to BufferGeometry.
   */
  toBufferGeometry(): BufferGeometry {
    return exportBufferGeometry(this.mesh);
  }

  /**
   * Validate the mesh after repairs.
   */
  validate(): { isValid: boolean; errors: string[] } {
    const validation = validateTopology(this.mesh);
    return {
      isValid: validation.isValid,
      errors: [
        ...validation.errors.map((e) => e.message),
        ...validation.warnings.map((w) => w.message),
      ],
    };
  }
}
