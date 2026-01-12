import type { Edge } from '../../core/Edge';
import type { Vertex } from '../../core/Vertex';
import type { NonManifoldMesh } from '../../core/NonManifoldMesh';
import { triangleArea, isPointInTriangle } from '../../geometry/GeometricUtils';
import { RepairOperation } from './RepairOperation';

/**
 * Represents a boundary loop (hole) in the mesh.
 */
interface BoundaryLoop {
  vertices: Vertex[];
  edges: Edge[];
}

/**
 * Fills holes in the mesh by triangulating boundary loops.
 */
export class HoleFiller extends RepairOperation {
  private holes: BoundaryLoop[] = [];
  private maxHoleSize: number;
  private preserveBoundary: boolean;

  constructor(
    mesh: NonManifoldMesh,
    verbose: boolean = false,
    maxHoleSize: number = 100,
    preserveBoundary: boolean = false
  ) {
    super(mesh, verbose);
    this.maxHoleSize = maxHoleSize;
    this.preserveBoundary = preserveBoundary;
  }

  detect(): number {
    this.holes = [];

    // Find all boundary edges
    const boundaryEdges: Edge[] = [];
    for (const edge of this.mesh.edges.values()) {
      // Boundary edges have exactly 1 halfedge (1 incident face)
      if (edge.allHalfedges.length === 1) {
        boundaryEdges.push(edge);
      }
    }

    if (boundaryEdges.length === 0) {
      return 0;
    }

    // Extract boundary loops from boundary edges
    this.holes = this.extractBoundaryLoops(boundaryEdges);

    // Filter by size
    this.holes = this.holes.filter((hole) => hole.vertices.length <= this.maxHoleSize);

    if (this.verbose && this.holes.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Found ${this.holes.length} holes`);
    }

    return this.holes.length;
  }

  repair(): number {
    if (this.preserveBoundary) {
      // Don't fill holes if we want to preserve boundaries
      return 0;
    }

    let fixedCount = 0;

    for (const hole of this.holes) {
      const triangles = this.triangulateBoundaryLoop(hole);

      if (triangles.length > 0) {
        // Add new faces to mesh
        for (const tri of triangles) {
          try {
            this.mesh.createFace(tri.v0, tri.v1, tri.v2);
          } catch {
            // Face creation failed, skip
            continue;
          }
        }
        fixedCount++;
      }
    }

    if (this.verbose && fixedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Filled ${fixedCount} holes`);
    }

    return fixedCount;
  }

  /**
   * Extract boundary loops from a set of boundary edges.
   */
  private extractBoundaryLoops(boundaryEdges: Edge[]): BoundaryLoop[] {
    const loops: BoundaryLoop[] = [];
    const visited = new Set<number>();

    for (const startEdge of boundaryEdges) {
      if (visited.has(startEdge.id as number)) continue;

      const loop: Vertex[] = [];
      const loopEdges: Edge[] = [];
      let currentEdge = startEdge;
      let iterations = 0;
      const maxIterations = 10000;

      do {
        if (iterations++ > maxIterations) break;

        visited.add(currentEdge.id as number);
        const [v0, v1] = currentEdge.getVertices();
        if (!v0 || !v1) break;

        loop.push(v0);
        loopEdges.push(currentEdge);

        // Find next boundary edge connected to v1
        const nextEdge = this.findNextBoundaryEdge(v1, currentEdge, boundaryEdges);
        if (!nextEdge || nextEdge === startEdge) {
          loop.push(v1);
          break;
        }

        currentEdge = nextEdge;
      } while (currentEdge !== startEdge);

      if (loop.length >= 3) {
        loops.push({ vertices: loop, edges: loopEdges });
      }
    }

    return loops;
  }

  /**
   * Find the next boundary edge connected to a vertex.
   */
  private findNextBoundaryEdge(
    vertex: Vertex,
    currentEdge: Edge,
    boundaryEdges: Edge[]
  ): Edge | null {
    for (const edge of boundaryEdges) {
      if (edge === currentEdge) continue;

      const [v0, v1] = edge.getVertices();
      if (!v0 || !v1) continue;

      if (v0.id === vertex.id || v1.id === vertex.id) {
        return edge;
      }
    }
    return null;
  }

  /**
   * Triangulate a boundary loop using ear clipping algorithm.
   */
  private triangulateBoundaryLoop(loop: BoundaryLoop): { v0: Vertex; v1: Vertex; v2: Vertex }[] {
    const triangles: { v0: Vertex; v1: Vertex; v2: Vertex }[] = [];
    const vertices = [...loop.vertices];

    let iterations = 0;
    const maxIterations = vertices.length * vertices.length;

    while (vertices.length > 3 && iterations++ < maxIterations) {
      const earIndex = this.findEar(vertices);
      if (earIndex === -1) {
        // No ear found, can't triangulate
        break;
      }

      const prev = (earIndex - 1 + vertices.length) % vertices.length;
      const next = (earIndex + 1) % vertices.length;

      const v0 = vertices[prev];
      const v1 = vertices[earIndex];
      const v2 = vertices[next];

      if (!v0 || !v1 || !v2) break;

      // Add triangle
      triangles.push({ v0, v1, v2 });

      // Remove ear vertex
      vertices.splice(earIndex, 1);
    }

    // Add final triangle if we have exactly 3 vertices
    if (vertices.length === 3) {
      const v0 = vertices[0];
      const v1 = vertices[1];
      const v2 = vertices[2];

      if (v0 && v1 && v2) {
        triangles.push({ v0, v1, v2 });
      }
    }

    return triangles;
  }

  /**
   * Find an "ear" in the polygon (a triangle with no vertices inside).
   */
  private findEar(vertices: Vertex[]): number {
    const n = vertices.length;

    for (let i = 0; i < n; i++) {
      const prev = (i - 1 + n) % n;
      const next = (i + 1) % n;

      const v0 = vertices[prev];
      const v1 = vertices[i];
      const v2 = vertices[next];

      if (!v0 || !v1 || !v2) continue;

      // Check if this forms a valid triangle (non-zero area)
      const area = triangleArea(v0.position, v1.position, v2.position);
      if (area < 1e-10) continue;

      // Check if any other vertex is inside this triangle
      let isEar = true;
      for (let j = 0; j < n; j++) {
        if (j === prev || j === i || j === next) continue;

        const vj = vertices[j];
        if (!vj) continue;

        if (isPointInTriangle(vj.position, v0.position, v1.position, v2.position)) {
          isEar = false;
          break;
        }
      }

      if (isEar) {
        return i;
      }
    }

    return -1;
  }

  getName(): string {
    return 'Fill Holes';
  }

  canParallelize(): boolean {
    // Holes are spatially independent - can parallelize
    return this.holes.length > 10;
  }
}
