import type { Edge } from '../../core/Edge';
import type { NonManifoldMesh } from '../../core/NonManifoldMesh';
import type { VertexId } from '../../types/MeshData';
import { RepairOperation } from './RepairOperation';

/**
 * Strategy for repairing non-manifold edges.
 */
export type NonManifoldRepairStrategy = 'split' | 'collapse' | 'auto';

/**
 * Repairs non-manifold edges (edges with >2 incident faces).
 */
export class NonManifoldEdgeRepair extends RepairOperation {
  private nonManifoldEdges: Edge[] = [];
  private strategy: NonManifoldRepairStrategy;

  constructor(
    mesh: NonManifoldMesh,
    verbose: boolean = false,
    strategy: NonManifoldRepairStrategy = 'auto'
  ) {
    super(mesh, verbose);
    this.strategy = strategy;
  }

  detect(): number {
    this.nonManifoldEdges = [];

    for (const edge of this.mesh.edges.values()) {
      // Non-manifold edges have >2 halfedges (>2 incident faces)
      if (edge.allHalfedges.length > 2) {
        this.nonManifoldEdges.push(edge);
      }
    }

    if (this.verbose && this.nonManifoldEdges.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Found ${this.nonManifoldEdges.length} non-manifold edges`);
    }

    return this.nonManifoldEdges.length;
  }

  repair(): number {
    let fixedCount = 0;

    for (const edge of this.nonManifoldEdges) {
      // Skip if edge was already removed by a previous repair
      if (!this.mesh.edges.has(edge.id)) continue;

      const repairStrategy = this.determineStrategy(edge);

      if (repairStrategy === 'split') {
        if (this.splitNonManifoldEdge(edge)) {
          fixedCount++;
        }
      } else {
        if (this.collapseNonManifoldEdge(edge)) {
          fixedCount++;
        }
      }
    }

    if (this.verbose && fixedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Repaired ${fixedCount} non-manifold edges`);
    }

    return fixedCount;
  }

  /**
   * Determine which strategy to use for a specific edge.
   */
  private determineStrategy(edge: Edge): 'split' | 'collapse' {
    if (this.strategy !== 'auto') {
      return this.strategy;
    }

    // Auto strategy: prefer split for long edges, collapse for short edges
    const avgEdgeLength = this.computeAverageEdgeLength();
    const edgeLength = edge.length;

    return edgeLength > avgEdgeLength ? 'split' : 'collapse';
  }

  /**
   * Compute average edge length in the mesh.
   */
  private computeAverageEdgeLength(): number {
    let totalLength = 0;
    let count = 0;

    for (const edge of this.mesh.edges.values()) {
      totalLength += edge.length;
      count++;
    }

    return count > 0 ? totalLength / count : 1.0;
  }

  /**
   * Split a non-manifold edge by duplicating vertices.
   */
  private splitNonManifoldEdge(edge: Edge): boolean {
    try {
      const [v0, v1] = edge.getVertices();
      if (!v0 || !v1) return false;

      // For each pair of faces sharing this edge, create separate edges
      // by duplicating one of the vertices
      const halfedges = [...edge.allHalfedges];
      if (halfedges.length <= 2) return false;

      // Keep first two halfedges with original edge
      // For remaining halfedges, duplicate v1 and create new edges
      for (let i = 2; i < halfedges.length; i++) {
        const he = halfedges[i];
        if (!he || !he.face) continue;

        // Create duplicate of v1
        const newVertex = this.mesh.createVertex(v1.position.clone());

        // Update face to use new vertex
        const faceVertices = he.face.getVertices();
        if (!faceVertices) continue;

        // Find which vertex in the face is v1 and replace it
        const vertexIndices: number[] = [];
        for (const v of faceVertices) {
          if (v.id === v1.id) {
            vertexIndices.push(newVertex.id as number);
          } else {
            vertexIndices.push(v.id as number);
          }
        }

        // Remove old face
        this.mesh.faces.delete(he.face.id);

        // Create new face with updated vertices
        const vertices = vertexIndices.map((id) => this.mesh.vertices.get(id as VertexId));
        if (!vertices[0] || !vertices[1] || !vertices[2]) continue;
        this.mesh.createFace(vertices[0], vertices[1], vertices[2]);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Collapse a non-manifold edge by removing excess faces.
   */
  private collapseNonManifoldEdge(edge: Edge): boolean {
    try {
      // Keep only the first 2 faces, remove the rest
      const halfedges = [...edge.allHalfedges];
      if (halfedges.length <= 2) return false;

      let removedCount = 0;
      for (let i = 2; i < halfedges.length; i++) {
        const he = halfedges[i];
        if (!he || !he.face) continue;

        // Remove the face
        this.mesh.faces.delete(he.face.id);

        // Clean up halfedges
        const faceHalfedges = he.face.getHalfedges();
        if (faceHalfedges) {
          for (const fhe of faceHalfedges) {
            this.mesh.halfedges.delete(fhe.id);
            fhe.edge.allHalfedges = fhe.edge.allHalfedges.filter((h) => h.id !== fhe.id);
          }
        }

        removedCount++;
      }

      return removedCount > 0;
    } catch {
      return false;
    }
  }

  getName(): string {
    return 'Remove Non-Manifold Edges';
  }

  canParallelize(): boolean {
    // Can parallelize if edges are spatially separated
    return this.nonManifoldEdges.length > 100;
  }
}
