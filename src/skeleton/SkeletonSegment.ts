import type { SegmentId } from '../types/MeshData';
import type { Vertex } from '../core/Vertex';
import type { Edge } from '../core/Edge';
import type { Vec3 } from '../geometry/GeometricUtils';
import { distance, projectPointOnSegment, lerp } from '../geometry/GeometricUtils';

/**
 * Represents a segment of the feature skeleton.
 * A segment is a path of skeleton edges between two branching vertices.
 */
export class SkeletonSegment {
  /**
   * Vertices along this segment, in order from start to end.
   * Includes the endpoint branching vertices.
   */
  public vertices: Vertex[] = [];

  /**
   * Edges along this segment, in order.
   */
  public edges: Edge[] = [];

  /**
   * Whether this segment forms a closed loop.
   */
  public isClosed: boolean = false;

  /**
   * Total arc length of this segment.
   */
  private _totalLength: number = 0;

  /**
   * Cumulative lengths at each vertex (for parameterization).
   */
  private _cumulativeLengths: number[] = [];

  constructor(
    /**
     * Unique identifier for this segment.
     */
    public readonly id: SegmentId
  ) {}

  /**
   * Gets the start vertex of this segment.
   */
  get startVertex(): Vertex | undefined {
    return this.vertices[0];
  }

  /**
   * Gets the end vertex of this segment.
   */
  get endVertex(): Vertex | undefined {
    return this.vertices[this.vertices.length - 1];
  }

  /**
   * Gets the total arc length of this segment.
   */
  get totalLength(): number {
    return this._totalLength;
  }

  /**
   * Gets the number of vertices in this segment.
   */
  get vertexCount(): number {
    return this.vertices.length;
  }

  /**
   * Gets the number of edges in this segment.
   */
  get edgeCount(): number {
    return this.edges.length;
  }

  /**
   * Adds a vertex to the end of the segment.
   */
  addVertex(vertex: Vertex): void {
    if (this.vertices.length > 0) {
      const lastVertex = this.vertices[this.vertices.length - 1]!;
      const edgeLength = distance(
        { x: lastVertex.position.x, y: lastVertex.position.y, z: lastVertex.position.z },
        { x: vertex.position.x, y: vertex.position.y, z: vertex.position.z }
      );
      this._totalLength += edgeLength;
    }

    this._cumulativeLengths.push(this._totalLength);
    this.vertices.push(vertex);
  }

  /**
   * Adds an edge to the segment.
   */
  addEdge(edge: Edge): void {
    this.edges.push(edge);
  }

  /**
   * Recomputes the total length and cumulative lengths.
   */
  recomputeLengths(): void {
    this._totalLength = 0;
    this._cumulativeLengths = [0];

    for (let i = 1; i < this.vertices.length; i++) {
      const v0 = this.vertices[i - 1]!;
      const v1 = this.vertices[i]!;
      const len = distance(
        { x: v0.position.x, y: v0.position.y, z: v0.position.z },
        { x: v1.position.x, y: v1.position.y, z: v1.position.z }
      );
      this._totalLength += len;
      this._cumulativeLengths.push(this._totalLength);
    }
  }

  /**
   * Gets the parameter t (0 to 1) for a vertex index.
   */
  getParameterAtVertex(index: number): number {
    if (this._totalLength === 0 || index < 0 || index >= this.vertices.length) {
      return 0;
    }
    return (this._cumulativeLengths[index] ?? 0) / this._totalLength;
  }

  /**
   * Gets the position at a parameter t along the segment.
   *
   * @param t - Parameter from 0 (start) to 1 (end)
   * @returns The interpolated position
   */
  getPositionAt(t: number): Vec3 | null {
    if (this.vertices.length === 0) {
      return null;
    }

    if (this.vertices.length === 1) {
      const v = this.vertices[0]!;
      return { x: v.position.x, y: v.position.y, z: v.position.z };
    }

    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));

    const targetLength = t * this._totalLength;

    // Find the edge containing this parameter
    for (let i = 1; i < this.vertices.length; i++) {
      const prevLen = this._cumulativeLengths[i - 1] ?? 0;
      const currLen = this._cumulativeLengths[i] ?? 0;

      if (targetLength <= currLen) {
        const v0 = this.vertices[i - 1]!;
        const v1 = this.vertices[i]!;
        const edgeLength = currLen - prevLen;

        if (edgeLength < 1e-10) {
          return { x: v0.position.x, y: v0.position.y, z: v0.position.z };
        }

        const localT = (targetLength - prevLen) / edgeLength;
        return lerp(
          { x: v0.position.x, y: v0.position.y, z: v0.position.z },
          { x: v1.position.x, y: v1.position.y, z: v1.position.z },
          localT
        );
      }
    }

    // Return end position
    const lastV = this.vertices[this.vertices.length - 1]!;
    return { x: lastV.position.x, y: lastV.position.y, z: lastV.position.z };
  }

  /**
   * Projects a point onto this segment.
   * Returns the closest point on the segment and its parameter.
   */
  projectPoint(point: Vec3): { point: Vec3; parameter: number; distance: number } | null {
    if (this.vertices.length === 0) {
      return null;
    }

    if (this.vertices.length === 1) {
      const v = this.vertices[0]!;
      const pos = { x: v.position.x, y: v.position.y, z: v.position.z };
      return {
        point: pos,
        parameter: 0,
        distance: distance(point, pos),
      };
    }

    let bestPoint: Vec3 | null = null;
    let bestParam = 0;
    let bestDist = Infinity;

    for (let i = 1; i < this.vertices.length; i++) {
      const v0 = this.vertices[i - 1]!;
      const v1 = this.vertices[i]!;
      const p0 = { x: v0.position.x, y: v0.position.y, z: v0.position.z };
      const p1 = { x: v1.position.x, y: v1.position.y, z: v1.position.z };

      const projected = projectPointOnSegment(point, p0, p1);
      const dist = distance(point, projected);

      if (dist < bestDist) {
        bestDist = dist;
        bestPoint = projected;

        // Compute parameter
        const prevLen = this._cumulativeLengths[i - 1] ?? 0;
        const currLen = this._cumulativeLengths[i] ?? 0;
        const edgeLength = currLen - prevLen;

        if (edgeLength < 1e-10) {
          bestParam = prevLen / this._totalLength;
        } else {
          const localDist = distance(p0, projected);
          bestParam = (prevLen + localDist) / this._totalLength;
        }
      }
    }

    if (!bestPoint) {
      return null;
    }

    return {
      point: bestPoint,
      parameter: bestParam,
      distance: bestDist,
    };
  }

  /**
   * Gets the vertex at a specific index.
   */
  getVertex(index: number): Vertex | undefined {
    return this.vertices[index];
  }

  /**
   * Gets the edge at a specific index.
   */
  getEdge(index: number): Edge | undefined {
    return this.edges[index];
  }

  /**
   * Checks if a vertex is part of this segment.
   */
  containsVertex(vertex: Vertex): boolean {
    return this.vertices.some((v) => v.id === vertex.id);
  }

  /**
   * Checks if an edge is part of this segment.
   */
  containsEdge(edge: Edge): boolean {
    return this.edges.some((e) => e.id === edge.id);
  }

  /**
   * Gets the index of a vertex in this segment.
   */
  indexOfVertex(vertex: Vertex): number {
    return this.vertices.findIndex((v) => v.id === vertex.id);
  }

  /**
   * Iterates over vertices in this segment.
   */
  forEachVertex(callback: (vertex: Vertex, index: number) => void): void {
    this.vertices.forEach(callback);
  }

  /**
   * Iterates over edges in this segment.
   */
  forEachEdge(callback: (edge: Edge, index: number) => void): void {
    this.edges.forEach(callback);
  }

  /**
   * Creates a copy of this segment.
   */
  clone(newId: SegmentId): SkeletonSegment {
    const segment = new SkeletonSegment(newId);
    segment.vertices = [...this.vertices];
    segment.edges = [...this.edges];
    segment.isClosed = this.isClosed;
    segment._totalLength = this._totalLength;
    segment._cumulativeLengths = [...this._cumulativeLengths];
    return segment;
  }
}
