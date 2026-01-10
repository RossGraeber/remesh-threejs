import type { Vector3 } from 'three';
import type { VertexId } from '../types/MeshData';
import type { Halfedge } from './Edge';
import { VertexType } from '../types/SkeletonData';

/**
 * Maximum iterations for vertex traversal to prevent infinite loops.
 */
const MAX_ITERATIONS = 10000;

/**
 * Represents a vertex in the mesh.
 * Stores position, classification, and a reference to one outgoing halfedge.
 */
export class Vertex {
  /**
   * One outgoing halfedge from this vertex.
   * All outgoing halfedges can be found by following next/twin pointers.
   */
  public halfedge: Halfedge | null = null;

  /**
   * Classification of this vertex based on neighborhood topology.
   * Determines movement constraints during remeshing.
   */
  public type: VertexType = VertexType.Manifold;

  /**
   * Whether this vertex is marked (e.g., for selection or processing).
   */
  public isMarked: boolean = false;

  constructor(
    /**
     * Unique identifier for this vertex.
     */
    public readonly id: VertexId,

    /**
     * 3D position of this vertex.
     */
    public readonly position: Vector3
  ) {}

  /**
   * Gets the degree of this vertex (number of incident edges).
   * Returns null if the vertex has no incident halfedge.
   */
  degree(): number | null {
    if (!this.halfedge) {
      return null;
    }

    let count = 0;
    let current = this.halfedge;

    do {
      count++;
      // Move to next outgoing halfedge by going to twin's next
      if (!current.twin || !current.twin.next) {
        // Boundary vertex or invalid structure - count remaining edges manually
        break;
      }
      current = current.twin.next;

      // Safety check to prevent infinite loops
      if (count > MAX_ITERATIONS) {
        throw new Error(`Vertex ${this.id}: degree calculation exceeded maximum iterations`);
      }
    } while (current !== this.halfedge);

    return count;
  }

  /**
   * Iterates over all outgoing halfedges from this vertex.
   *
   * @param callback - Function called for each outgoing halfedge
   */
  forEachOutgoingHalfedge(callback: (halfedge: Halfedge) => void): void {
    if (!this.halfedge) {
      return;
    }

    let current = this.halfedge;
    let iterationCount = 0;

    do {
      callback(current);

      // Move to next outgoing halfedge
      if (!current.twin || !current.twin.next) {
        break;
      }
      current = current.twin.next;

      // Safety check
      iterationCount++;
      if (iterationCount > MAX_ITERATIONS) {
        throw new Error(`Vertex ${this.id}: halfedge iteration exceeded maximum iterations`);
      }
    } while (current !== this.halfedge);
  }

  /**
   * Collects all outgoing halfedges from this vertex into an array.
   *
   * @returns Array of outgoing halfedges
   */
  getOutgoingHalfedges(): Halfedge[] {
    const halfedges: Halfedge[] = [];
    this.forEachOutgoingHalfedge((he) => halfedges.push(he));
    return halfedges;
  }

  /**
   * Iterates over all neighboring vertices.
   *
   * @param callback - Function called for each neighboring vertex
   */
  forEachNeighbor(callback: (vertex: Vertex) => void): void {
    this.forEachOutgoingHalfedge((he) => {
      callback(he.vertex);
    });
  }

  /**
   * Collects all neighboring vertices into an array.
   *
   * @returns Array of neighboring vertices
   */
  getNeighbors(): Vertex[] {
    const neighbors: Vertex[] = [];
    this.forEachNeighbor((v) => neighbors.push(v));
    return neighbors;
  }

  /**
   * Checks if this vertex is on the boundary of the mesh.
   * A vertex is on the boundary if any of its incident halfedges has no face.
   */
  isBoundary(): boolean {
    if (!this.halfedge) {
      return true;
    }

    let hasBoundaryHalfedge = false;
    this.forEachOutgoingHalfedge((he) => {
      if (!he.face) {
        hasBoundaryHalfedge = true;
      }
    });

    return hasBoundaryHalfedge;
  }

  /**
   * Checks if this vertex can move freely during remeshing.
   * Only manifold vertices can move freely in 3D space.
   */
  canMoveFreely(): boolean {
    return this.type === VertexType.Manifold;
  }

  /**
   * Checks if this vertex is constrained to a skeleton segment.
   * OpenBook vertices can only move along their skeleton segment.
   */
  isSkeletonConstrained(): boolean {
    return this.type === VertexType.OpenBook;
  }

  /**
   * Checks if this vertex has a fixed position.
   * Branching and other non-manifold vertices cannot move.
   */
  isPositionFixed(): boolean {
    return this.type === VertexType.SkeletonBranching || this.type === VertexType.NonManifoldOther;
  }

  /**
   * Checks if this vertex is part of the feature skeleton.
   */
  isOnSkeleton(): boolean {
    return this.type !== VertexType.Manifold;
  }
}
