import type { BufferGeometry } from 'three';
import { NonManifoldMesh } from '../core/NonManifoldMesh';
import { type FeatureSkeleton, createSkeleton } from '../core/FeatureSkeleton';
import {
  createSkeletonConstraints,
  type SkeletonConstraints,
} from '../skeleton/SkeletonConstraints';
import { exportBufferGeometry } from '../io/BufferGeometryExporter';
import { splitLongEdges } from '../operations/EdgeSplit';
import { contractShortEdges } from '../operations/EdgeContraction';
import { makeDelaunay } from '../operations/EdgeFlip';
import { smoothAllVertices } from '../operations/VertexRelocation';
import {
  computeMeshQuality,
  computeTargetEdgeLength,
  type MeshQualityStats,
} from './QualityMetrics';
import type { RemeshOptions, RemeshStats } from '../types/RemeshOptions';
import { DEFAULT_REMESH_OPTIONS } from '../types/RemeshOptions';

/**
 * State during remeshing iteration.
 */
interface RemeshingState {
  iteration: number;
  edgeSplits: number;
  edgeContractions: number;
  edgeFlips: number;
  vertexRelocations: number;
  quality: MeshQualityStats;
}

/**
 * Adaptive remeshing algorithm for non-manifold surfaces.
 *
 * Based on the EUROGRAPHICS 2008 paper "Adaptive Remeshing of Non-Manifold Surfaces"
 * by Zilske, Lamecker, and Zachow.
 */
export class AdaptiveRemesher {
  private mesh: NonManifoldMesh;
  private skeleton: FeatureSkeleton | null = null;
  private constraints: SkeletonConstraints | null = null;
  private options: Required<Omit<RemeshOptions, 'targetEdgeLength' | 'featureEdges'>> & {
    targetEdgeLength: number;
  };
  private state: RemeshingState;

  constructor(mesh: NonManifoldMesh, options: RemeshOptions = {}) {
    this.mesh = mesh;

    // Merge with defaults
    const targetEdgeLength = options.targetEdgeLength ?? computeTargetEdgeLength(mesh);
    this.options = {
      ...DEFAULT_REMESH_OPTIONS,
      ...options,
      targetEdgeLength,
    };

    // Initialize state
    this.state = {
      iteration: 0,
      edgeSplits: 0,
      edgeContractions: 0,
      edgeFlips: 0,
      vertexRelocations: 0,
      quality: computeMeshQuality(mesh),
    };

    // Build skeleton if mesh has non-manifold edges
    if (!mesh.isManifold()) {
      this.skeleton = createSkeleton(mesh);
      this.constraints = createSkeletonConstraints(this.skeleton);
    }
  }

  /**
   * Runs one iteration of the remeshing algorithm.
   *
   * Each iteration performs:
   * 1. Split long edges
   * 2. Collapse short edges
   * 3. Flip edges for Delaunay
   * 4. Smooth vertex positions
   */
  iterate(): RemeshingState {
    this.state.iteration++;

    const targetLength = this.options.targetEdgeLength;
    const minLength = targetLength * this.options.minEdgeLengthRatio;
    const maxLength = targetLength * this.options.maxEdgeLengthRatio;

    // 1. Split long edges
    const splitResult = splitLongEdges(this.mesh, maxLength);
    this.state.edgeSplits += splitResult.splitCount;

    // 2. Collapse short edges
    const contractResult = contractShortEdges(this.mesh, minLength);
    this.state.edgeContractions += contractResult.contractCount;

    // 3. Flip edges for Delaunay
    const flipCount = makeDelaunay(this.mesh);
    this.state.edgeFlips += flipCount;

    // 4. Smooth vertex positions
    const smoothResult = smoothAllVertices(this.mesh, this.constraints ?? undefined, 0.5);
    this.state.vertexRelocations += smoothResult.smoothedCount;

    // Rebuild skeleton if needed
    if (this.skeleton && (splitResult.splitCount > 0 || contractResult.contractCount > 0)) {
      this.skeleton.rebuild();
    }

    // Update quality stats
    this.state.quality = computeMeshQuality(this.mesh, this.options.minTriangleQuality);

    if (this.options.verbose) {
      console.warn(
        `Iteration ${this.state.iteration}: splits=${splitResult.splitCount}, ` +
          `contractions=${contractResult.contractCount}, flips=${flipCount}, ` +
          `smoothed=${smoothResult.smoothedCount}, avgQuality=${this.state.quality.averageQuality.toFixed(3)}`
      );
    }

    return { ...this.state };
  }

  /**
   * Runs multiple iterations until convergence or max iterations.
   */
  run(maxIterations?: number): RemeshStats {
    const iterations = maxIterations ?? this.options.iterations;
    const startTime = Date.now();
    const inputStats = {
      vertices: this.mesh.vertexCount,
      faces: this.mesh.faceCount,
    };

    for (let i = 0; i < iterations; i++) {
      const prevQuality = this.state.quality.averageQuality;
      this.iterate();

      // Check for convergence
      const qualityImprovement = this.state.quality.averageQuality - prevQuality;
      if (Math.abs(qualityImprovement) < 0.001 && i > 0) {
        if (this.options.verbose) {
          console.warn(`Converged after ${i + 1} iterations`);
        }
        break;
      }
    }

    const processingTimeMs = Date.now() - startTime;

    return {
      inputVertices: inputStats.vertices,
      inputFaces: inputStats.faces,
      outputVertices: this.mesh.vertexCount,
      outputFaces: this.mesh.faceCount,
      iterations: this.state.iteration,
      finalQuality: this.state.quality.averageQuality,
      nonManifoldEdges: this.mesh.getNonManifoldEdges().length,
      skeletonEdges: this.mesh.getSkeletonEdges().length,
      edgeFlips: this.state.edgeFlips,
      edgeSplits: this.state.edgeSplits,
      edgeContractions: this.state.edgeContractions,
      vertexRelocations: this.state.vertexRelocations,
      processingTimeMs,
    };
  }

  /**
   * Checks if the remeshing has converged.
   */
  hasConverged(): boolean {
    return this.state.quality.averageQuality > 0.9 || this.state.quality.poorQualityCount === 0;
  }

  /**
   * Gets the current mesh.
   */
  getMesh(): NonManifoldMesh {
    return this.mesh;
  }

  /**
   * Gets the skeleton (if built).
   */
  getSkeleton(): FeatureSkeleton | null {
    return this.skeleton;
  }

  /**
   * Gets the current quality stats.
   */
  getQuality(): MeshQualityStats {
    return this.state.quality;
  }

  /**
   * Gets the current state.
   */
  getState(): RemeshingState {
    return { ...this.state };
  }

  /**
   * Exports the mesh to BufferGeometry.
   */
  toBufferGeometry(): BufferGeometry {
    return exportBufferGeometry(this.mesh);
  }
}

/**
 * Simple function to remesh a BufferGeometry.
 */
export function remesh(
  geometry: BufferGeometry,
  options: RemeshOptions = {}
): { geometry: BufferGeometry; stats: RemeshStats } {
  const mesh = NonManifoldMesh.fromBufferGeometry(geometry, options.featureEdges);
  const remesher = new AdaptiveRemesher(mesh, options);
  const stats = remesher.run();
  const outputGeometry = remesher.toBufferGeometry();

  return { geometry: outputGeometry, stats };
}

/**
 * Creates a remesher from a BufferGeometry.
 */
export function createRemesher(
  geometry: BufferGeometry,
  options: RemeshOptions = {}
): AdaptiveRemesher {
  const mesh = NonManifoldMesh.fromBufferGeometry(geometry, options.featureEdges);
  return new AdaptiveRemesher(mesh, options);
}
