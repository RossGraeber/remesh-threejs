import type { NonManifoldMesh } from './NonManifoldMesh';
import type { Vertex } from './Vertex';
import type { Edge } from './Edge';
import type { SkeletonBuildResult } from '../skeleton/SkeletonBuilder';
import type { SkeletonSegment } from '../skeleton/SkeletonSegment';
import { SkeletonBuilder } from '../skeleton/SkeletonBuilder';
import type { SegmentId } from '../types/MeshData';
import type { Vec3 } from '../geometry/GeometricUtils';

/**
 * Represents the feature skeleton of a mesh.
 * The skeleton consists of non-manifold edges, boundary edges, and feature edges.
 */
export class FeatureSkeleton {
  /** The mesh this skeleton belongs to */
  public readonly mesh: NonManifoldMesh;

  /** All segments in the skeleton */
  public segments: Map<SegmentId, SkeletonSegment> = new Map();

  /** All skeleton edges */
  private skeletonEdges: Edge[] = [];

  /** All branching vertices */
  private branchingVertices: Vertex[] = [];

  /** All open-book vertices */
  private openBookVertices: Vertex[] = [];

  /** Map from vertex to its segment (for open-book vertices) */
  private vertexToSegment: Map<number, SkeletonSegment> = new Map();

  /** Whether the skeleton has been built */
  private isBuilt: boolean = false;

  constructor(mesh: NonManifoldMesh) {
    this.mesh = mesh;
  }

  /**
   * Builds the skeleton from the mesh.
   */
  build(): void {
    const builder = new SkeletonBuilder(this.mesh);
    const result = builder.build();

    this.applyBuildResult(result);
    this.isBuilt = true;
  }

  /**
   * Applies a build result to this skeleton.
   */
  private applyBuildResult(result: SkeletonBuildResult): void {
    this.segments.clear();
    this.vertexToSegment.clear();

    for (const segment of result.segments) {
      this.segments.set(segment.id, segment);

      // Map vertices to segments (excluding branching vertices at endpoints)
      for (let i = 1; i < segment.vertices.length - 1; i++) {
        const vertex = segment.vertices[i];
        if (vertex) {
          this.vertexToSegment.set(vertex.id as number, segment);
        }
      }
    }

    this.skeletonEdges = result.skeletonEdges;
    this.branchingVertices = result.branchingVertices;
    this.openBookVertices = result.openBookVertices;
  }

  /**
   * Rebuilds the skeleton. Call after topology changes.
   */
  rebuild(): void {
    this.build();
  }

  /**
   * Gets all segments.
   */
  getSegments(): SkeletonSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Gets a segment by ID.
   */
  getSegment(id: SegmentId): SkeletonSegment | undefined {
    return this.segments.get(id);
  }

  /**
   * Gets the segment containing a vertex.
   * Only works for open-book vertices.
   */
  getSegmentForVertex(vertex: Vertex): SkeletonSegment | undefined {
    return this.vertexToSegment.get(vertex.id as number);
  }

  /**
   * Gets all skeleton edges.
   */
  getSkeletonEdges(): Edge[] {
    return this.skeletonEdges;
  }

  /**
   * Gets all branching vertices.
   */
  getBranchingVertices(): Vertex[] {
    return this.branchingVertices;
  }

  /**
   * Gets all open-book vertices.
   */
  getOpenBookVertices(): Vertex[] {
    return this.openBookVertices;
  }

  /**
   * Gets the number of segments.
   */
  get segmentCount(): number {
    return this.segments.size;
  }

  /**
   * Gets the number of skeleton edges.
   */
  get skeletonEdgeCount(): number {
    return this.skeletonEdges.length;
  }

  /**
   * Gets the number of branching vertices.
   */
  get branchingVertexCount(): number {
    return this.branchingVertices.length;
  }

  /**
   * Gets the number of open-book vertices.
   */
  get openBookVertexCount(): number {
    return this.openBookVertices.length;
  }

  /**
   * Checks if the skeleton has been built.
   */
  get built(): boolean {
    return this.isBuilt;
  }

  /**
   * Projects a point onto the skeleton.
   * Returns the closest point on any segment.
   */
  projectPoint(point: Vec3): {
    point: Vec3;
    segment: SkeletonSegment;
    parameter: number;
    distance: number;
  } | null {
    let bestResult: {
      point: Vec3;
      segment: SkeletonSegment;
      parameter: number;
      distance: number;
    } | null = null;

    for (const segment of this.segments.values()) {
      const projection = segment.projectPoint(point);
      if (projection && (!bestResult || projection.distance < bestResult.distance)) {
        bestResult = {
          point: projection.point,
          segment,
          parameter: projection.parameter,
          distance: projection.distance,
        };
      }
    }

    return bestResult;
  }

  /**
   * Checks if a vertex is on the skeleton.
   */
  isVertexOnSkeleton(vertex: Vertex): boolean {
    return vertex.isOnSkeleton();
  }

  /**
   * Checks if an edge is on the skeleton.
   */
  isEdgeOnSkeleton(edge: Edge): boolean {
    return edge.isSkeletonEdge();
  }

  /**
   * Gets all vertices on the skeleton.
   */
  getAllSkeletonVertices(): Vertex[] {
    return [...this.branchingVertices, ...this.openBookVertices];
  }

  /**
   * Computes the total length of the skeleton.
   */
  getTotalLength(): number {
    let total = 0;
    for (const segment of this.segments.values()) {
      total += segment.totalLength;
    }
    return total;
  }

  /**
   * Gets statistics about the skeleton.
   */
  getStats(): {
    segmentCount: number;
    skeletonEdgeCount: number;
    branchingVertexCount: number;
    openBookVertexCount: number;
    totalLength: number;
    closedLoopCount: number;
  } {
    let closedLoopCount = 0;
    for (const segment of this.segments.values()) {
      if (segment.isClosed) {
        closedLoopCount++;
      }
    }

    return {
      segmentCount: this.segmentCount,
      skeletonEdgeCount: this.skeletonEdgeCount,
      branchingVertexCount: this.branchingVertexCount,
      openBookVertexCount: this.openBookVertexCount,
      totalLength: this.getTotalLength(),
      closedLoopCount,
    };
  }
}

/**
 * Creates and builds a skeleton for a mesh.
 */
export function createSkeleton(mesh: NonManifoldMesh): FeatureSkeleton {
  const skeleton = new FeatureSkeleton(mesh);
  skeleton.build();
  return skeleton;
}
