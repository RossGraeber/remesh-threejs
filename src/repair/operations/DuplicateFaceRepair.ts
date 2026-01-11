import type { Face } from '../../core/Face';
import type { Vertex } from '../../core/Vertex';
import { RepairOperation } from './RepairOperation';

/**
 * Repairs duplicate faces (faces with identical vertices).
 */
export class DuplicateFaceRepair extends RepairOperation {
  private duplicates: Map<string, Face[]> = new Map();

  detect(): number {
    this.duplicates.clear();
    const faceMap = new Map<string, Face[]>();

    for (const face of this.mesh.faces.values()) {
      const vertices = face.getVertices();
      if (!vertices) continue;

      const key = this.makeFaceKey(vertices);

      if (!faceMap.has(key)) {
        faceMap.set(key, []);
      }
      faceMap.get(key)!.push(face);
    }

    // Find duplicates
    let duplicateCount = 0;
    for (const [key, faces] of faceMap) {
      if (faces.length > 1) {
        this.duplicates.set(key, faces);
        duplicateCount += faces.length - 1; // Keep one, remove rest
      }
    }

    if (this.verbose && duplicateCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Found ${duplicateCount} duplicate faces in ${this.duplicates.size} groups`);
    }

    return duplicateCount;
  }

  repair(): number {
    let fixedCount = 0;

    for (const faces of this.duplicates.values()) {
      // Keep first face, remove duplicates
      for (let i = 1; i < faces.length; i++) {
        const face = faces[i];
        if (!face) continue;

        this.mesh.faces.delete(face.id);

        // Clean up halfedges
        const halfedges = face.getHalfedges();
        if (!halfedges) continue;

        for (const he of halfedges) {
          this.mesh.halfedges.delete(he.id);
          he.edge.allHalfedges = he.edge.allHalfedges.filter((h) => h.id !== he.id);
        }

        fixedCount++;
      }
    }

    if (this.verbose && fixedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Removed ${fixedCount} duplicate faces`);
    }

    return fixedCount;
  }

  /**
   * Create canonical key from sorted vertex IDs.
   */
  private makeFaceKey(vertices: [Vertex, Vertex, Vertex]): string {
    const ids = vertices.map((v) => v.id as number).sort((a, b) => a - b);
    return ids.join(',');
  }

  getName(): string {
    return 'Remove Duplicate Faces';
  }

  canParallelize(): boolean {
    // Duplicate detection needs global view - not easily parallelizable
    return false;
  }
}
