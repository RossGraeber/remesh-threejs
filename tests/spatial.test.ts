import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHash, createSpatialHash } from '../src/spatial/SpatialHash';
import { BVH } from '../src/spatial/BVH';
import type { Vec3 } from '../src/geometry/GeometricUtils';
import type { Triangle } from '../src/spatial/BVH';

describe('SpatialHash', () => {
  describe('constructor', () => {
    it('should create a spatial hash with valid cell size', () => {
      const hash = new SpatialHash<string>(1.0);
      expect(hash.size).toBe(0);
      expect(hash.cellCount).toBe(0);
    });

    it('should throw for non-positive cell size', () => {
      expect(() => new SpatialHash<string>(0)).toThrow('Cell size must be positive');
      expect(() => new SpatialHash<string>(-1)).toThrow('Cell size must be positive');
    });
  });

  describe('insert and query', () => {
    let hash: SpatialHash<string>;

    beforeEach(() => {
      hash = new SpatialHash<string>(1.0);
    });

    it('should insert items and retrieve them', () => {
      hash.insert('a', { x: 0, y: 0, z: 0 });
      hash.insert('b', { x: 1, y: 0, z: 0 });

      expect(hash.size).toBe(2);
      expect(hash.has('a')).toBe(true);
      expect(hash.has('b')).toBe(true);
    });

    it('should query items within radius', () => {
      hash.insert('a', { x: 0, y: 0, z: 0 });
      hash.insert('b', { x: 1, y: 0, z: 0 });
      hash.insert('c', { x: 10, y: 0, z: 0 });

      const results = hash.queryRadius({ x: 0, y: 0, z: 0 }, 2);
      expect(results).toContain('a');
      expect(results).toContain('b');
      expect(results).not.toContain('c');
    });

    it('should return empty array for query with no results', () => {
      hash.insert('a', { x: 100, y: 100, z: 100 });

      const results = hash.queryRadius({ x: 0, y: 0, z: 0 }, 1);
      expect(results).toHaveLength(0);
    });
  });

  describe('remove', () => {
    it('should remove items', () => {
      const hash = new SpatialHash<string>(1.0);
      hash.insert('a', { x: 0, y: 0, z: 0 });

      expect(hash.remove('a')).toBe(true);
      expect(hash.size).toBe(0);
      expect(hash.has('a')).toBe(false);
    });

    it('should return false when removing non-existent item', () => {
      const hash = new SpatialHash<string>(1.0);
      expect(hash.remove('nonexistent')).toBe(false);
    });
  });

  describe('update', () => {
    it('should update item position', () => {
      const hash = new SpatialHash<string>(1.0);
      hash.insert('a', { x: 0, y: 0, z: 0 });
      hash.update('a', { x: 10, y: 10, z: 10 });

      const resultsOld = hash.queryRadius({ x: 0, y: 0, z: 0 }, 1);
      const resultsNew = hash.queryRadius({ x: 10, y: 10, z: 10 }, 1);

      expect(resultsOld).not.toContain('a');
      expect(resultsNew).toContain('a');
    });
  });

  describe('queryKNearest', () => {
    it('should find k nearest neighbors', () => {
      const hash = new SpatialHash<string>(1.0);
      hash.insert('a', { x: 0, y: 0, z: 0 });
      hash.insert('b', { x: 1, y: 0, z: 0 });
      hash.insert('c', { x: 2, y: 0, z: 0 });
      hash.insert('d', { x: 3, y: 0, z: 0 });

      const results = hash.queryKNearest({ x: 0, y: 0, z: 0 }, 2);
      expect(results).toHaveLength(2);
      expect(results[0]).toBe('a'); // Closest
      expect(results[1]).toBe('b'); // Second closest
    });

    it('should respect maxRadius', () => {
      const hash = new SpatialHash<string>(1.0);
      hash.insert('a', { x: 0, y: 0, z: 0 });
      hash.insert('b', { x: 100, y: 0, z: 0 });

      const results = hash.queryKNearest({ x: 0, y: 0, z: 0 }, 2, 10);
      expect(results).toHaveLength(1);
      expect(results[0]).toBe('a');
    });
  });

  describe('clear', () => {
    it('should clear all items', () => {
      const hash = new SpatialHash<string>(1.0);
      hash.insert('a', { x: 0, y: 0, z: 0 });
      hash.insert('b', { x: 1, y: 0, z: 0 });

      hash.clear();
      expect(hash.size).toBe(0);
      expect(hash.cellCount).toBe(0);
    });
  });

  describe('getPosition', () => {
    it('should return item position', () => {
      const hash = new SpatialHash<string>(1.0);
      const pos: Vec3 = { x: 1, y: 2, z: 3 };
      hash.insert('a', pos);

      expect(hash.getPosition('a')).toEqual(pos);
    });

    it('should return undefined for non-existent item', () => {
      const hash = new SpatialHash<string>(1.0);
      expect(hash.getPosition('nonexistent')).toBeUndefined();
    });
  });

  describe('iteration', () => {
    it('should iterate over all items', () => {
      const hash = new SpatialHash<string>(1.0);
      hash.insert('a', { x: 0, y: 0, z: 0 });
      hash.insert('b', { x: 1, y: 0, z: 0 });

      const items = [...hash];
      expect(items).toHaveLength(2);
      expect(items).toContain('a');
      expect(items).toContain('b');
    });

    it('should get all items', () => {
      const hash = new SpatialHash<string>(1.0);
      hash.insert('a', { x: 0, y: 0, z: 0 });
      hash.insert('b', { x: 1, y: 0, z: 0 });

      const items = hash.getAll();
      expect(items).toHaveLength(2);
    });
  });
});

describe('createSpatialHash', () => {
  it('should create a spatial hash from items', () => {
    interface Point {
      id: string;
      pos: Vec3;
    }

    const items: Point[] = [
      { id: 'a', pos: { x: 0, y: 0, z: 0 } },
      { id: 'b', pos: { x: 1, y: 0, z: 0 } },
      { id: 'c', pos: { x: 2, y: 0, z: 0 } },
    ];

    const hash = createSpatialHash(items, (item) => item.pos);

    expect(hash.size).toBe(3);
    expect(hash.has(items[0]!)).toBe(true);
    expect(hash.has(items[1]!)).toBe(true);
    expect(hash.has(items[2]!)).toBe(true);
  });

  it('should accept custom cell size', () => {
    const items = [{ pos: { x: 0, y: 0, z: 0 } }];
    const hash = createSpatialHash(items, (item) => item.pos, 5.0);
    expect(hash.size).toBe(1);
  });
});

describe('BVH', () => {
  describe('build', () => {
    it('should build from empty triangle array', () => {
      const bvh = new BVH();
      bvh.build([]);
      expect(bvh.triangleCount).toBe(0);
    });

    it('should build from single triangle', () => {
      const bvh = new BVH();
      const triangles: Triangle[] = [
        {
          v0: { x: 0, y: 0, z: 0 },
          v1: { x: 1, y: 0, z: 0 },
          v2: { x: 0.5, y: 1, z: 0 },
        },
      ];
      bvh.build(triangles);
      expect(bvh.triangleCount).toBe(1);
    });

    it('should build from multiple triangles', () => {
      const bvh = new BVH();
      const triangles: Triangle[] = [];

      // Create a grid of triangles
      for (let i = 0; i < 10; i++) {
        triangles.push({
          v0: { x: i, y: 0, z: 0 },
          v1: { x: i + 1, y: 0, z: 0 },
          v2: { x: i + 0.5, y: 1, z: 0 },
        });
      }

      bvh.build(triangles);
      expect(bvh.triangleCount).toBe(10);
    });
  });

  describe('closestPoint', () => {
    it('should return null for empty BVH', () => {
      const bvh = new BVH();
      bvh.build([]);
      expect(bvh.closestPoint({ x: 0, y: 0, z: 0 })).toBeNull();
    });

    it('should find closest point on single triangle', () => {
      const bvh = new BVH();
      const triangles: Triangle[] = [
        {
          v0: { x: 0, y: 0, z: 0 },
          v1: { x: 1, y: 0, z: 0 },
          v2: { x: 0.5, y: 1, z: 0 },
        },
      ];
      bvh.build(triangles);

      // Query point directly above triangle center
      const result = bvh.closestPoint({ x: 0.5, y: 0.5, z: 1 });

      expect(result).not.toBeNull();
      expect(result!.triangleIndex).toBe(0);
      expect(result!.point.z).toBeCloseTo(0);
    });

    it('should find closest point to vertex', () => {
      const bvh = new BVH();
      const triangles: Triangle[] = [
        {
          v0: { x: 0, y: 0, z: 0 },
          v1: { x: 1, y: 0, z: 0 },
          v2: { x: 0.5, y: 1, z: 0 },
        },
      ];
      bvh.build(triangles);

      // Query point near v0
      const result = bvh.closestPoint({ x: -1, y: -1, z: 0 });

      expect(result).not.toBeNull();
      expect(result!.point.x).toBeCloseTo(0);
      expect(result!.point.y).toBeCloseTo(0);
    });

    it('should find closest point on edge', () => {
      const bvh = new BVH();
      const triangles: Triangle[] = [
        {
          v0: { x: 0, y: 0, z: 0 },
          v1: { x: 2, y: 0, z: 0 },
          v2: { x: 1, y: 2, z: 0 },
        },
      ];
      bvh.build(triangles);

      // Query point below the v0-v1 edge
      const result = bvh.closestPoint({ x: 1, y: -1, z: 0 });

      expect(result).not.toBeNull();
      expect(result!.point.x).toBeCloseTo(1);
      expect(result!.point.y).toBeCloseTo(0);
    });

    it('should handle multiple triangles', () => {
      const bvh = new BVH();
      const triangles: Triangle[] = [
        {
          v0: { x: 0, y: 0, z: 0 },
          v1: { x: 1, y: 0, z: 0 },
          v2: { x: 0.5, y: 1, z: 0 },
        },
        {
          v0: { x: 10, y: 0, z: 0 },
          v1: { x: 11, y: 0, z: 0 },
          v2: { x: 10.5, y: 1, z: 0 },
        },
      ];
      bvh.build(triangles);

      // Query point closer to second triangle
      const result = bvh.closestPoint({ x: 10.5, y: 0.5, z: 0 });

      expect(result).not.toBeNull();
      expect(result!.triangleIndex).toBe(1);
    });
  });

  describe('queryRadius', () => {
    it('should return empty array for empty BVH', () => {
      const bvh = new BVH();
      bvh.build([]);
      expect(bvh.queryRadius({ x: 0, y: 0, z: 0 }, 10)).toEqual([]);
    });

    it('should find triangles within radius', () => {
      const bvh = new BVH();
      const triangles: Triangle[] = [
        {
          v0: { x: 0, y: 0, z: 0 },
          v1: { x: 1, y: 0, z: 0 },
          v2: { x: 0.5, y: 1, z: 0 },
        },
        {
          v0: { x: 100, y: 0, z: 0 },
          v1: { x: 101, y: 0, z: 0 },
          v2: { x: 100.5, y: 1, z: 0 },
        },
      ];
      bvh.build(triangles);

      const results = bvh.queryRadius({ x: 0.5, y: 0.5, z: 0 }, 2);

      expect(results).toContain(0);
      expect(results).not.toContain(1);
    });

    it('should find multiple triangles within radius', () => {
      const bvh = new BVH();
      const triangles: Triangle[] = [];

      // Create adjacent triangles
      for (let i = 0; i < 5; i++) {
        triangles.push({
          v0: { x: i, y: 0, z: 0 },
          v1: { x: i + 1, y: 0, z: 0 },
          v2: { x: i + 0.5, y: 1, z: 0 },
        });
      }

      bvh.build(triangles);

      // Query with large radius to capture all
      const results = bvh.queryRadius({ x: 2.5, y: 0.5, z: 0 }, 10);
      expect(results).toHaveLength(5);
    });
  });

  describe('getTriangle', () => {
    it('should return triangle by index', () => {
      const bvh = new BVH();
      const triangles: Triangle[] = [
        {
          v0: { x: 0, y: 0, z: 0 },
          v1: { x: 1, y: 0, z: 0 },
          v2: { x: 0.5, y: 1, z: 0 },
        },
      ];
      bvh.build(triangles);

      const tri = bvh.getTriangle(0);
      expect(tri).toBeDefined();
      expect(tri!.v0).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('should return undefined for invalid index', () => {
      const bvh = new BVH();
      bvh.build([]);
      expect(bvh.getTriangle(0)).toBeUndefined();
    });
  });
});
