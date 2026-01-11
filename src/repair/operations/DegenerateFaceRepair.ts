import type { Face } from '../../core/Face';
import type { NonManifoldMesh } from '../../core/NonManifoldMesh';
import { triangleArea } from '../../geometry/GeometricUtils';
import { RepairOperation } from './RepairOperation';

/**
 * Repairs degenerate faces (zero-area triangles, duplicate vertices).
 */
export class DegenerateFaceRepair extends RepairOperation {
  private degenerateFaces: Face[] = [];
  private areaThreshold: number;

  constructor(mesh: NonManifoldMesh, verbose: boolean = false, areaThreshold: number = 1e-10) {
    super(mesh, verbose);
    this.areaThreshold = areaThreshold;
  }

  detect(): number {
    this.degenerateFaces = [];

    for (const face of this.mesh.faces.values()) {
      const vertices = face.getVertices();
      if (!vertices || vertices.length !== 3) continue;

      // Check for duplicate vertices
      const [v0, v1, v2] = vertices;
      if (v0.id === v1.id || v1.id === v2.id || v2.id === v0.id) {
        this.degenerateFaces.push(face);
        continue;
      }

      // Check for zero/near-zero area
      const area = triangleArea(v0.position, v1.position, v2.position);
      if (area < this.areaThreshold) {
        this.degenerateFaces.push(face);
      }
    }

    if (this.verbose && this.degenerateFaces.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`Found ${this.degenerateFaces.length} degenerate faces`);
    }

    return this.degenerateFaces.length;
  }

  repair(): number {
    let fixedCount = 0;

    for (const face of this.degenerateFaces) {
      // Simply remove the degenerate face
      const halfedges = face.getHalfedges();
      if (!halfedges) continue;

      // Remove face
      this.mesh.faces.delete(face.id);

      // Clean up halfedges
      for (const he of halfedges) {
        this.mesh.halfedges.delete(he.id);
        he.edge.allHalfedges = he.edge.allHalfedges.filter((h) => h.id !== he.id);
      }

      fixedCount++;
    }

    if (this.verbose && fixedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Removed ${fixedCount} degenerate faces`);
    }

    return fixedCount;
  }

  getName(): string {
    return 'Remove Degenerate Faces';
  }

  canParallelize(): boolean {
    // Face removal is independent - highly parallelizable
    return this.degenerateFaces.length > 1000;
  }
}
