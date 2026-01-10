import type { FaceId } from '../types/MeshData';
import type { Halfedge } from './Edge';
import type { Vertex } from './Vertex';

/**
 * Represents a triangular face in the mesh.
 * A face is defined by three halfedges forming a loop.
 */
export class Face {
  /**
   * One of the three halfedges bounding this face.
   * The other two can be found by following next pointers.
   */
  public halfedge: Halfedge;

  /**
   * Whether this face is marked (e.g., for selection or processing).
   */
  public isMarked: boolean = false;

  constructor(
    /**
     * Unique identifier for this face.
     */
    public readonly id: FaceId,

    /**
     * One of the bounding halfedges.
     */
    halfedge: Halfedge
  ) {
    this.halfedge = halfedge;
  }

  /**
   * Gets all three vertices of this face.
   * Returns vertices in counter-clockwise order.
   */
  getVertices(): [Vertex, Vertex, Vertex] | null {
    const he0 = this.halfedge;
    const he1 = he0.next;
    const he2 = he1?.next;

    if (!he1 || !he2) {
      return null;
    }

    return [he0.vertex, he1.vertex, he2.vertex];
  }

  /**
   * Gets all three halfedges of this face.
   * Returns halfedges in counter-clockwise order.
   */
  getHalfedges(): [Halfedge, Halfedge, Halfedge] | null {
    const he0 = this.halfedge;
    const he1 = he0.next;
    const he2 = he1?.next;

    if (!he1 || !he2) {
      return null;
    }

    return [he0, he1, he2];
  }

  /**
   * Iterates over the three halfedges of this face.
   *
   * @param callback - Function called for each halfedge
   */
  forEachHalfedge(callback: (halfedge: Halfedge) => void): void {
    const halfedges = this.getHalfedges();
    if (!halfedges) {
      return;
    }

    for (const he of halfedges) {
      callback(he);
    }
  }

  /**
   * Iterates over the three vertices of this face.
   *
   * @param callback - Function called for each vertex
   */
  forEachVertex(callback: (vertex: Vertex) => void): void {
    const vertices = this.getVertices();
    if (!vertices) {
      return;
    }

    for (const v of vertices) {
      callback(v);
    }
  }

  /**
   * Computes the centroid (center of mass) of this face.
   * Returns null if vertices cannot be retrieved.
   */
  getCentroid(): { x: number; y: number; z: number } | null {
    const vertices = this.getVertices();
    if (!vertices) {
      return null;
    }

    const [v0, v1, v2] = vertices;
    return {
      x: (v0.position.x + v1.position.x + v2.position.x) / 3,
      y: (v0.position.y + v1.position.y + v2.position.y) / 3,
      z: (v0.position.z + v1.position.z + v2.position.z) / 3,
    };
  }

  /**
   * Computes the normal vector of this face.
   * Uses the cross product of two edges.
   * Returns null if vertices cannot be retrieved.
   */
  getNormal(): { x: number; y: number; z: number } | null {
    const vertices = this.getVertices();
    if (!vertices) {
      return null;
    }

    const [v0, v1, v2] = vertices;

    // Edge vectors
    const e1x = v1.position.x - v0.position.x;
    const e1y = v1.position.y - v0.position.y;
    const e1z = v1.position.z - v0.position.z;

    const e2x = v2.position.x - v0.position.x;
    const e2y = v2.position.y - v0.position.y;
    const e2z = v2.position.z - v0.position.z;

    // Cross product
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;

    // Normalize
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len < 1e-10) {
      return { x: 0, y: 0, z: 1 }; // Degenerate face
    }

    return {
      x: nx / len,
      y: ny / len,
      z: nz / len,
    };
  }

  /**
   * Computes the area of this face.
   * Returns null if vertices cannot be retrieved.
   */
  getArea(): number | null {
    const vertices = this.getVertices();
    if (!vertices) {
      return null;
    }

    const [v0, v1, v2] = vertices;

    // Edge vectors
    const e1x = v1.position.x - v0.position.x;
    const e1y = v1.position.y - v0.position.y;
    const e1z = v1.position.z - v0.position.z;

    const e2x = v2.position.x - v0.position.x;
    const e2y = v2.position.y - v0.position.y;
    const e2z = v2.position.z - v0.position.z;

    // Cross product magnitude / 2
    const cx = e1y * e2z - e1z * e2y;
    const cy = e1z * e2x - e1x * e2z;
    const cz = e1x * e2y - e1y * e2x;

    return Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
  }

  /**
   * Computes the quality of this triangle.
   * Quality is measured as 2 * inradius / circumradius (ranges from 0 to 1).
   * A value of 1 indicates an equilateral triangle.
   * Returns null if vertices cannot be retrieved.
   */
  getQuality(): number | null {
    const vertices = this.getVertices();
    if (!vertices) {
      return null;
    }

    const [v0, v1, v2] = vertices;

    // Compute edge lengths
    const a = Math.sqrt(
      Math.pow(v1.position.x - v2.position.x, 2) +
        Math.pow(v1.position.y - v2.position.y, 2) +
        Math.pow(v1.position.z - v2.position.z, 2)
    );
    const b = Math.sqrt(
      Math.pow(v0.position.x - v2.position.x, 2) +
        Math.pow(v0.position.y - v2.position.y, 2) +
        Math.pow(v0.position.z - v2.position.z, 2)
    );
    const c = Math.sqrt(
      Math.pow(v0.position.x - v1.position.x, 2) +
        Math.pow(v0.position.y - v1.position.y, 2) +
        Math.pow(v0.position.z - v1.position.z, 2)
    );

    // Semi-perimeter
    const s = (a + b + c) / 2;

    // Area via Heron's formula
    const areaSquared = s * (s - a) * (s - b) * (s - c);
    if (areaSquared <= 0) {
      return 0; // Degenerate triangle
    }
    const area = Math.sqrt(areaSquared);

    // Inradius: r = area / s
    const inradius = area / s;

    // Circumradius: R = (a * b * c) / (4 * area)
    const circumradius = (a * b * c) / (4 * area);

    if (circumradius < 1e-10) {
      return 0;
    }

    // Quality: 2 * r / R (normalized to [0, 1])
    const quality = (2 * inradius) / circumradius;

    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Checks if this face contains a given vertex.
   */
  containsVertex(vertex: Vertex): boolean {
    const vertices = this.getVertices();
    if (!vertices) {
      return false;
    }

    return vertices.some((v) => v.id === vertex.id);
  }

  /**
   * Gets the halfedge opposite to a given vertex.
   * Returns null if the vertex is not part of this face.
   */
  getOppositeHalfedge(vertex: Vertex): Halfedge | null {
    const halfedges = this.getHalfedges();
    if (!halfedges) {
      return null;
    }

    for (const he of halfedges) {
      const source = he.getSourceVertex();
      if (source && source.id !== vertex.id && he.vertex.id !== vertex.id) {
        return he;
      }
    }

    return null;
  }

  /**
   * Checks if this face is degenerate (has zero or near-zero area).
   */
  isDegenerate(epsilon: number = 1e-10): boolean {
    const area = this.getArea();
    return area === null || area < epsilon;
  }
}
