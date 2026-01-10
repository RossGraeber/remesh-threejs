import type { EdgeId, HalfedgeId } from '../types/MeshData';
import type { Vertex } from './Vertex';
import type { Face } from './Face';
import { EdgeType } from '../types/SkeletonData';

/**
 * Represents a halfedge in the mesh.
 * A halfedge is a directed edge from one vertex to another.
 */
export class Halfedge {
  /**
   * The vertex this halfedge points to (target vertex).
   */
  public vertex: Vertex;

  /**
   * The opposite halfedge (same edge, opposite direction).
   * For non-manifold edges, this points to one of potentially many twins.
   */
  public twin: Halfedge | null = null;

  /**
   * The next halfedge in the face loop (counter-clockwise).
   */
  public next: Halfedge | null = null;

  /**
   * The previous halfedge in the face loop.
   */
  public prev: Halfedge | null = null;

  /**
   * The face this halfedge belongs to (null for boundary halfedges).
   */
  public face: Face | null = null;

  /**
   * The parent undirected edge.
   */
  public edge: Edge;

  constructor(
    /**
     * Unique identifier for this halfedge.
     */
    public readonly id: HalfedgeId,

    /**
     * The vertex this halfedge points to.
     */
    vertex: Vertex,

    /**
     * The parent edge.
     */
    edge: Edge
  ) {
    this.vertex = vertex;
    this.edge = edge;
  }

  /**
   * Gets the source vertex of this halfedge (the vertex it starts from).
   * This is the target vertex of the twin halfedge.
   */
  getSourceVertex(): Vertex | null {
    return this.twin?.vertex ?? null;
  }

  /**
   * Gets the target vertex of this halfedge.
   */
  getTargetVertex(): Vertex {
    return this.vertex;
  }

  /**
   * Checks if this halfedge is on the boundary (has no face).
   */
  isBoundary(): boolean {
    return this.face === null;
  }

  /**
   * Gets the opposite halfedge in the same face (two edges away).
   * For a triangle, this is the edge opposite to this halfedge's source vertex.
   */
  getOppositeHalfedge(): Halfedge | null {
    return this.next?.next ?? null;
  }

  /**
   * Gets the vertex opposite to this halfedge in its face.
   * For a triangle, this is the vertex not on this halfedge.
   */
  getOppositeVertex(): Vertex | null {
    return this.next?.vertex ?? null;
  }

  /**
   * Computes the vector along this halfedge (from source to target).
   * Returns null if source vertex is not available.
   */
  getVector(): { x: number; y: number; z: number } | null {
    const source = this.getSourceVertex();
    if (!source) {
      return null;
    }

    return {
      x: this.vertex.position.x - source.position.x,
      y: this.vertex.position.y - source.position.y,
      z: this.vertex.position.z - source.position.z,
    };
  }
}

/**
 * Represents an undirected edge in the mesh.
 * For non-manifold meshes, an edge can have more than 2 halfedges.
 */
export class Edge {
  /**
   * One of the halfedges comprising this edge (used for traversal).
   */
  public halfedge: Halfedge;

  /**
   * All halfedges associated with this edge.
   * For manifold edges, this contains exactly 2 halfedges.
   * For non-manifold edges, this contains more than 2 halfedges.
   */
  public allHalfedges: Halfedge[] = [];

  /**
   * The intrinsic length of this edge.
   * This may differ from the Euclidean distance after edge operations.
   */
  public length: number;

  /**
   * Classification of this edge.
   */
  public type: EdgeType = EdgeType.Manifold;

  /**
   * Whether this edge is part of any path in a network.
   */
  public isInPath: boolean = false;

  constructor(
    /**
     * Unique identifier for this edge.
     */
    public readonly id: EdgeId,

    /**
     * One of the halfedges.
     */
    halfedge: Halfedge,

    /**
     * Initial edge length.
     */
    length: number
  ) {
    this.halfedge = halfedge;
    this.length = length;
    this.allHalfedges.push(halfedge);
  }

  /**
   * Adds a halfedge to this edge.
   */
  addHalfedge(halfedge: Halfedge): void {
    this.allHalfedges.push(halfedge);
    this.updateType();
  }

  /**
   * Gets the number of halfedges (indicates non-manifoldness).
   * 2 = manifold, >2 = non-manifold, 1 = boundary
   */
  getHalfedgeCount(): number {
    return this.allHalfedges.length;
  }

  /**
   * Updates the edge type based on the number of incident faces.
   */
  updateType(): void {
    const faceCount = this.getFaceCount();

    if (faceCount === 0) {
      // Isolated edge (shouldn't normally happen)
      this.type = EdgeType.Boundary;
    } else if (faceCount === 1) {
      this.type = EdgeType.Boundary;
    } else if (faceCount === 2) {
      // Could still be a feature edge - don't override if already set
      if (this.type !== EdgeType.Feature) {
        this.type = EdgeType.Manifold;
      }
    } else {
      // More than 2 faces = non-manifold
      this.type = EdgeType.NonManifold;
    }
  }

  /**
   * Gets the number of faces incident to this edge.
   */
  getFaceCount(): number {
    let count = 0;
    for (const he of this.allHalfedges) {
      if (he.face !== null) {
        count++;
      }
    }
    return count;
  }

  /**
   * Gets both vertices of this edge.
   * Returns [v0, v1] where v0 is the source of halfedge and v1 is the target.
   */
  getVertices(): [Vertex, Vertex] | [null, null] {
    const v0 = this.halfedge.getSourceVertex();
    const v1 = this.halfedge.getTargetVertex();

    if (!v0) {
      return [null, null];
    }

    return [v0, v1];
  }

  /**
   * Gets all faces adjacent to this edge.
   * For manifold edges, returns up to 2 faces.
   * For non-manifold edges, returns all incident faces.
   */
  getFaces(): Face[] {
    const faces: Face[] = [];
    for (const he of this.allHalfedges) {
      if (he.face !== null) {
        faces.push(he.face);
      }
    }
    return faces;
  }

  /**
   * Gets both faces adjacent to this edge (for manifold edges).
   * Returns [f0, f1] where f0 is the face of halfedge and f1 is the face of twin.
   * Either face can be null for boundary edges.
   */
  getTwoFaces(): [Face | null, Face | null] {
    const f0 = this.halfedge.face;
    const f1 = this.halfedge.twin?.face ?? null;
    return [f0, f1];
  }

  /**
   * Checks if this edge is on the boundary (has only one adjacent face).
   */
  isBoundary(): boolean {
    return this.type === EdgeType.Boundary;
  }

  /**
   * Checks if this edge is non-manifold (has more than 2 adjacent faces).
   */
  isNonManifold(): boolean {
    return this.type === EdgeType.NonManifold;
  }

  /**
   * Checks if this edge is part of the feature skeleton.
   */
  isSkeletonEdge(): boolean {
    return (
      this.type === EdgeType.NonManifold ||
      this.type === EdgeType.Feature ||
      this.type === EdgeType.Boundary
    );
  }

  /**
   * Checks if this edge can be flipped.
   * An edge can be flipped if:
   * 1. It has exactly two adjacent faces (manifold, not skeleton)
   * 2. Both endpoints have degree > 1
   * 3. The quadrilateral formed is convex (checked separately)
   */
  canFlip(): boolean {
    // Only manifold edges can be flipped
    if (this.type !== EdgeType.Manifold) {
      return false;
    }

    // Check if edge has exactly two faces
    if (this.getFaceCount() !== 2) {
      return false;
    }

    // Check vertex degrees
    const [v0, v1] = this.getVertices();
    if (!v0 || !v1) {
      return false;
    }

    const degree0 = v0.degree();
    const degree1 = v1.degree();

    if (degree0 === null || degree1 === null || degree0 <= 1 || degree1 <= 1) {
      return false;
    }

    // Convexity check would require geometric information (done in EdgeFlip algorithm)
    return true;
  }

  /**
   * Gets the other vertex of this edge (given one vertex).
   */
  getOtherVertex(v: Vertex): Vertex | null {
    const [v0, v1] = this.getVertices();
    if (!v0 || !v1) {
      return null;
    }

    if (v.id === v0.id) {
      return v1;
    } else if (v.id === v1.id) {
      return v0;
    }

    return null;
  }

  /**
   * Marks this edge as a feature edge.
   */
  markAsFeature(): void {
    if (this.type === EdgeType.Manifold) {
      this.type = EdgeType.Feature;
    }
  }
}
