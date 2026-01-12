import type { Face } from '../../core/Face';
import type { Edge } from '../../core/Edge';
import type { Halfedge } from '../../core/Edge';
import type { NonManifoldMesh } from '../../core/NonManifoldMesh';
import type { Vertex } from '../../core/Vertex';
import { RepairOperation } from './RepairOperation';

/**
 * Unifies face orientations to make normals consistent.
 */
export class NormalUnifier extends RepairOperation {
  private inconsistentFaces: Face[] = [];
  private seedFaceIndex: number;

  constructor(mesh: NonManifoldMesh, verbose: boolean = false, seedFaceIndex: number = 0) {
    super(mesh, verbose);
    this.seedFaceIndex = seedFaceIndex;
  }

  detect(): number {
    this.inconsistentFaces = [];

    const faces = Array.from(this.mesh.faces.values());
    if (faces.length === 0) return 0;

    // Use BFS/DFS to propagate orientation from seed face
    const visited = new Set<number>();
    const queue: Face[] = [];
    const seedFace = faces[this.seedFaceIndex] || faces[0];

    if (!seedFace) return 0;

    queue.push(seedFace);
    visited.add(seedFace.id as number);

    while (queue.length > 0) {
      const face = queue.shift()!;

      // Check neighboring faces
      const neighbors = this.getNeighborFaces(face);

      for (const neighbor of neighbors) {
        const neighborId = neighbor.id as number;
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        // Check if normals are consistent
        const sharedEdge = this.getSharedEdge(face, neighbor);
        if (sharedEdge && !this.areNormalsConsistent(face, neighbor, sharedEdge)) {
          this.inconsistentFaces.push(neighbor);
        }

        queue.push(neighbor);
      }
    }

    if (this.verbose && this.inconsistentFaces.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Found ${this.inconsistentFaces.length} faces with inconsistent normals`);
    }

    return this.inconsistentFaces.length;
  }

  repair(): number {
    let fixedCount = 0;

    for (const face of this.inconsistentFaces) {
      if (this.flipFaceOrientation(face)) {
        fixedCount++;
      }
    }

    if (this.verbose && fixedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Unified normals for ${fixedCount} faces`);
    }

    return fixedCount;
  }

  /**
   * Get faces that share an edge with the given face.
   */
  private getNeighborFaces(face: Face): Face[] {
    const neighbors: Face[] = [];
    const halfedges = face.getHalfedges();
    if (!halfedges) return neighbors;

    for (const he of halfedges) {
      // Get the twin halfedge (on the neighboring face)
      if (he.twin && he.twin.face && he.twin.face !== face) {
        neighbors.push(he.twin.face);
      }
    }

    return neighbors;
  }

  /**
   * Find the edge shared between two faces.
   */
  private getSharedEdge(face1: Face, face2: Face): Edge | null {
    const halfedges1 = face1.getHalfedges();
    const halfedges2 = face2.getHalfedges();
    if (!halfedges1 || !halfedges2) return null;

    for (const he1 of halfedges1) {
      for (const he2 of halfedges2) {
        if (he1.edge === he2.edge) {
          return he1.edge;
        }
      }
    }

    return null;
  }

  /**
   * Check if two faces have consistent normal orientation across their shared edge.
   */
  private areNormalsConsistent(face1: Face, face2: Face, sharedEdge: Edge): boolean {
    const he1 = this.getHalfedgeInFace(face1, sharedEdge);
    const he2 = this.getHalfedgeInFace(face2, sharedEdge);

    if (!he1 || !he2) return true;

    // For consistent orientation, halfedges should traverse the shared edge
    // in opposite directions (they should be twins)
    const [v1_start, v1_end] = this.getHalfedgeVertices(he1);
    const [v2_start, v2_end] = this.getHalfedgeVertices(he2);

    if (!v1_start || !v1_end || !v2_start || !v2_end) return true;

    // Consistent if: he1 goes from A->B and he2 goes from B->A
    return v1_start.id === v2_end.id && v1_end.id === v2_start.id;
  }

  /**
   * Get the halfedge in a face that corresponds to a given edge.
   */
  private getHalfedgeInFace(face: Face, edge: Edge): Halfedge | null {
    const halfedges = face.getHalfedges();
    if (!halfedges) return null;

    for (const he of halfedges) {
      if (he.edge === edge) {
        return he;
      }
    }

    return null;
  }

  /**
   * Get the start and end vertices of a halfedge.
   */
  private getHalfedgeVertices(he: Halfedge): [Vertex | null, Vertex | null] {
    return [he.vertex, he.next?.vertex || null];
  }

  /**
   * Flip the orientation of a face by reversing its halfedge order.
   */
  private flipFaceOrientation(face: Face): boolean {
    try {
      const halfedges = face.getHalfedges();
      if (!halfedges || halfedges.length !== 3) return false;

      const [he0, he1, he2] = halfedges;

      // Reverse the circular order by swapping next and prev
      const temp0 = he0.next;
      he0.next = he0.prev;
      he0.prev = temp0;

      const temp1 = he1.next;
      he1.next = he1.prev;
      he1.prev = temp1;

      const temp2 = he2.next;
      he2.next = he2.prev;
      he2.prev = temp2;

      return true;
    } catch {
      return false;
    }
  }

  getName(): string {
    return 'Unify Normals';
  }

  canParallelize(): boolean {
    // Normal unification requires global traversal - not parallelizable
    return false;
  }
}
