import { describe, it, expect } from 'vitest';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { NonManifoldMesh } from '../../src/core/NonManifoldMesh';
import { IsolatedVertexRepair } from '../../src/repair/operations/IsolatedVertexRepair';
import { DegenerateFaceRepair } from '../../src/repair/operations/DegenerateFaceRepair';
import { DuplicateFaceRepair } from '../../src/repair/operations/DuplicateFaceRepair';

describe('Repair Operations', () => {
  describe('IsolatedVertexRepair', () => {
    it('should detect isolated vertices', () => {
      // Create mesh with 4 vertices but only 1 triangle
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          [
            0,
            0,
            0, // v0 - used in triangle
            1,
            0,
            0, // v1 - used in triangle
            0,
            1,
            0, // v2 - used in triangle
            5,
            5,
            5, // v3 - isolated
          ],
          3
        )
      );
      geometry.setIndex([0, 1, 2]);

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const repair = new IsolatedVertexRepair(mesh);

      expect(repair.detect()).toBe(1);
    });

    it('should remove isolated vertices', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          [
            0,
            0,
            0, // v0
            1,
            0,
            0, // v1
            0,
            1,
            0, // v2
            5,
            5,
            5, // v3 - isolated
          ],
          3
        )
      );
      geometry.setIndex([0, 1, 2]);

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const repair = new IsolatedVertexRepair(mesh);

      const stats = repair.execute();

      expect(stats.defectsFound).toBe(1);
      expect(stats.defectsFixed).toBe(1);
      expect(stats.success).toBe(true);
      expect(mesh.vertices.size).toBe(3);
    });

    it('should report no isolated vertices in valid mesh', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      geometry.setIndex([0, 1, 2]);

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const repair = new IsolatedVertexRepair(mesh);

      const stats = repair.execute();

      expect(stats.defectsFound).toBe(0);
      expect(stats.defectsFixed).toBe(0);
      expect(stats.success).toBe(true);
    });
  });

  describe('DegenerateFaceRepair', () => {
    it('should detect zero-area faces', () => {
      // Triangle with all vertices at the same point
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
      geometry.setIndex([0, 1, 2]);

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const repair = new DegenerateFaceRepair(mesh);

      expect(repair.detect()).toBe(1);
    });

    it('should detect collinear faces', () => {
      // Triangle with all vertices on a line
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 2, 0, 0], 3));
      geometry.setIndex([0, 1, 2]);

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const repair = new DegenerateFaceRepair(mesh);

      expect(repair.detect()).toBe(1);
    });

    it('should remove degenerate faces', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          [
            0,
            0,
            0, // Degenerate triangle
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0, // Valid triangle
            1,
            0,
            0,
            0,
            1,
            0,
          ],
          3
        )
      );
      geometry.setIndex([0, 1, 2, 3, 4, 5]);

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      expect(mesh.faces.size).toBe(2);

      const repair = new DegenerateFaceRepair(mesh);
      const stats = repair.execute();

      expect(stats.defectsFound).toBe(1);
      expect(stats.defectsFixed).toBe(1);
      expect(stats.success).toBe(true);
      expect(mesh.faces.size).toBe(1);
    });

    it('should not remove valid faces', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      geometry.setIndex([0, 1, 2]);

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const repair = new DegenerateFaceRepair(mesh);

      const stats = repair.execute();

      expect(stats.defectsFound).toBe(0);
      expect(stats.defectsFixed).toBe(0);
      expect(mesh.faces.size).toBe(1);
    });
  });

  describe('DuplicateFaceRepair', () => {
    it('should detect duplicate faces', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      // Same triangle twice
      geometry.setIndex([0, 1, 2, 0, 1, 2]);

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const repair = new DuplicateFaceRepair(mesh);

      expect(repair.detect()).toBe(1); // 1 duplicate (keep 1, remove 1)
    });

    it('should detect duplicates with different vertex order', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      // Same vertices but different order (canonical key should match)
      geometry.setIndex([0, 1, 2, 1, 2, 0]);

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const repair = new DuplicateFaceRepair(mesh);

      expect(repair.detect()).toBe(1);
    });

    it('should remove duplicate faces', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      geometry.setIndex([0, 1, 2, 0, 1, 2, 0, 1, 2]); // 3 identical faces

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      expect(mesh.faces.size).toBe(3);

      const repair = new DuplicateFaceRepair(mesh);
      const stats = repair.execute();

      expect(stats.defectsFound).toBe(2); // Keep 1, remove 2
      expect(stats.defectsFixed).toBe(2);
      expect(stats.success).toBe(true);
      expect(mesh.faces.size).toBe(1);
    });

    it('should not remove distinct faces', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          [
            0,
            0,
            0, // Triangle 1
            1,
            0,
            0,
            0,
            1,
            0,
            1,
            0,
            0, // Triangle 2 (different)
            1,
            1,
            0,
            0,
            1,
            0,
          ],
          3
        )
      );
      geometry.setIndex([0, 1, 2, 3, 4, 5]);

      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const repair = new DuplicateFaceRepair(mesh);

      const stats = repair.execute();

      expect(stats.defectsFound).toBe(0);
      expect(stats.defectsFixed).toBe(0);
      expect(mesh.faces.size).toBe(2);
    });
  });
});
