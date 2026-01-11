import type { Vertex } from '../../core/Vertex';
import { RepairOperation } from './RepairOperation';

/**
 * Repairs isolated vertices (vertices with no incident halfedges).
 */
export class IsolatedVertexRepair extends RepairOperation {
  private isolatedVertices: Vertex[] = [];

  detect(): number {
    this.isolatedVertices = [];

    for (const vertex of this.mesh.vertices.values()) {
      // Check if vertex has any incident halfedges
      if (!vertex.halfedge || vertex.degree() === 0) {
        this.isolatedVertices.push(vertex);
      }
    }

    if (this.verbose && this.isolatedVertices.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Found ${this.isolatedVertices.length} isolated vertices`);
    }

    return this.isolatedVertices.length;
  }

  repair(): number {
    let fixedCount = 0;

    for (const vertex of this.isolatedVertices) {
      this.mesh.vertices.delete(vertex.id);
      fixedCount++;
    }

    if (this.verbose && fixedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Removed ${fixedCount} isolated vertices`);
    }

    return fixedCount;
  }

  getName(): string {
    return 'Remove Isolated Vertices';
  }

  canParallelize(): boolean {
    // Vertex removal is independent - highly parallelizable
    return this.isolatedVertices.length > 1000;
  }
}
