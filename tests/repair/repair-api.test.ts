import { describe, it, expect } from 'vitest';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { MeshRepairer } from '../../src/repair/MeshRepairer';
import {
  repairMesh,
  removeIsolatedVertices,
  removeDegenerateFaces,
  removeDuplicateFaces,
} from '../../src/repair/RepairFunctions';

describe('Repair API', () => {
  describe('MeshRepairer (Class-based API)', () => {
    it('should create repairer from BufferGeometry', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      geometry.setIndex([0, 1, 2]);

      const repairer = new MeshRepairer(geometry);
      expect(repairer).toBeDefined();
      expect(repairer.getMesh()).toBeDefined();
    });

    it('should chain multiple operations', () => {
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
            5,
            5,
            5, // Isolated vertex
          ],
          3
        )
      );
      geometry.setIndex([0, 1, 2, 3, 4, 5]);

      const repairer = new MeshRepairer(geometry);
      const stats = repairer
        .removeIsolatedVertices()
        .removeDegenerateFaces()
        .removeDuplicateFaces()
        .execute();

      expect(stats.operations.length).toBe(3);
      expect(stats.totalDefectsFound).toBeGreaterThan(0);
      expect(stats.totalDefectsFixed).toBeGreaterThan(0);
    });

    it('should execute repairAll', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          [
            0,
            0,
            0, // Degenerate
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0, // Valid
            1,
            0,
            0,
            0,
            1,
            0,
            5,
            5,
            5, // Isolated
          ],
          3
        )
      );
      geometry.setIndex([0, 1, 2, 3, 4, 5]);

      const repairer = new MeshRepairer(geometry);
      const stats = repairer.repairAll().execute();

      expect(stats.operations.length).toBe(3);
      expect(stats.success).toBe(true);
    });

    it('should export repaired geometry', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 5, 5], 3)
      );
      geometry.setIndex([0, 1, 2]);

      const repairer = new MeshRepairer(geometry);
      repairer.removeIsolatedVertices().execute();

      const repaired = repairer.toBufferGeometry();
      expect(repaired).toBeInstanceOf(BufferGeometry);
      expect(repaired.attributes['position']).toBeDefined();
      expect(repaired.index).toBeDefined();
    });

    it('should validate repaired mesh', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      geometry.setIndex([0, 1, 2]);

      const repairer = new MeshRepairer(geometry);
      repairer.repairAll().execute();

      const validation = repairer.validate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should track stats correctly', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 5, 5], 3)
      );
      geometry.setIndex([0, 1, 2]);

      const repairer = new MeshRepairer(geometry);
      const stats = repairer.removeIsolatedVertices().execute();

      expect(stats.input.vertices).toBe(4);
      expect(stats.output.vertices).toBe(3);
      expect(stats.totalTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Functional API', () => {
    it('should repair mesh with repairMesh()', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          [
            0,
            0,
            0, // Degenerate
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0, // Valid
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

      const result = repairMesh(geometry);

      expect(result.geometry).toBeInstanceOf(BufferGeometry);
      expect(result.stats.operations.length).toBe(3);
      expect(result.stats.totalDefectsFixed).toBeGreaterThan(0);
    });

    it('should remove isolated vertices with removeIsolatedVertices()', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 5, 5, 5], 3)
      );
      geometry.setIndex([0, 1, 2]);

      const result = removeIsolatedVertices(geometry);

      expect(result.stats.operations.length).toBe(1);
      expect(result.stats.totalDefectsFound).toBe(1);
      expect(result.stats.totalDefectsFixed).toBe(1);
    });

    it('should remove degenerate faces with removeDegenerateFaces()', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
      geometry.setIndex([0, 1, 2]);

      const result = removeDegenerateFaces(geometry);

      expect(result.stats.operations.length).toBe(1);
      expect(result.stats.totalDefectsFixed).toBe(1);
    });

    it('should remove duplicate faces with removeDuplicateFaces()', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      geometry.setIndex([0, 1, 2, 0, 1, 2]);

      const result = removeDuplicateFaces(geometry);

      expect(result.stats.operations.length).toBe(1);
      expect(result.stats.totalDefectsFixed).toBe(1);
    });

    it('should accept repair options', () => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
      geometry.setIndex([0, 1, 2]);

      const result = repairMesh(geometry, {
        verbose: false,
        validateAfterEach: true,
      });

      expect(result.geometry).toBeInstanceOf(BufferGeometry);
      expect(result.stats).toBeDefined();
    });
  });
});
