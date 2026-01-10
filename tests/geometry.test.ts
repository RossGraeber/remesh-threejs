import { describe, it, expect } from 'vitest';
import {
  distance,
  distanceSquared,
  dot,
  cross,
  length,
  lengthSquared,
  normalize,
  add,
  subtract,
  scale,
  lerp,
  midpoint,
  angleBetween,
  projectPointOnLine,
  projectPointOnSegment,
  triangleArea,
  triangleNormal,
  triangleCentroid,
  triangleCircumcenter,
  triangleCircumradius,
  triangleInradius,
  triangleQuality,
  isPointInTriangle,
  barycentricCoordinates,
  isQuadConvex,
  cotangent,
  angleAtVertex,
  type Vec3,
} from '../src/geometry/GeometricUtils';

describe('Vector Operations', () => {
  describe('distanceSquared', () => {
    it('should compute squared distance between points', () => {
      const a: Vec3 = { x: 0, y: 0, z: 0 };
      const b: Vec3 = { x: 3, y: 4, z: 0 };
      expect(distanceSquared(a, b)).toBe(25);
    });

    it('should return 0 for same point', () => {
      const a: Vec3 = { x: 1, y: 2, z: 3 };
      expect(distanceSquared(a, a)).toBe(0);
    });
  });

  describe('distance', () => {
    it('should compute Euclidean distance', () => {
      const a: Vec3 = { x: 0, y: 0, z: 0 };
      const b: Vec3 = { x: 3, y: 4, z: 0 };
      expect(distance(a, b)).toBe(5);
    });

    it('should handle 3D distance', () => {
      const a: Vec3 = { x: 0, y: 0, z: 0 };
      const b: Vec3 = { x: 1, y: 1, z: 1 };
      expect(distance(a, b)).toBeCloseTo(Math.sqrt(3));
    });
  });

  describe('dot', () => {
    it('should compute dot product', () => {
      const a: Vec3 = { x: 1, y: 2, z: 3 };
      const b: Vec3 = { x: 4, y: 5, z: 6 };
      expect(dot(a, b)).toBe(32); // 1*4 + 2*5 + 3*6 = 32
    });

    it('should return 0 for perpendicular vectors', () => {
      const a: Vec3 = { x: 1, y: 0, z: 0 };
      const b: Vec3 = { x: 0, y: 1, z: 0 };
      expect(dot(a, b)).toBe(0);
    });
  });

  describe('cross', () => {
    it('should compute cross product', () => {
      const a: Vec3 = { x: 1, y: 0, z: 0 };
      const b: Vec3 = { x: 0, y: 1, z: 0 };
      const result = cross(a, b);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(1);
    });

    it('should produce right-handed result', () => {
      const x: Vec3 = { x: 1, y: 0, z: 0 };
      const y: Vec3 = { x: 0, y: 1, z: 0 };
      const z = cross(x, y);
      expect(z).toEqual({ x: 0, y: 0, z: 1 });
    });
  });

  describe('length', () => {
    it('should compute vector length', () => {
      const v: Vec3 = { x: 3, y: 4, z: 0 };
      expect(length(v)).toBe(5);
    });

    it('should return 0 for zero vector', () => {
      const v: Vec3 = { x: 0, y: 0, z: 0 };
      expect(length(v)).toBe(0);
    });
  });

  describe('lengthSquared', () => {
    it('should compute squared length', () => {
      const v: Vec3 = { x: 3, y: 4, z: 0 };
      expect(lengthSquared(v)).toBe(25);
    });
  });

  describe('normalize', () => {
    it('should return unit vector', () => {
      const v: Vec3 = { x: 3, y: 4, z: 0 };
      const result = normalize(v);
      expect(length(result)).toBeCloseTo(1);
      expect(result.x).toBeCloseTo(0.6);
      expect(result.y).toBeCloseTo(0.8);
    });

    it('should return zero vector for zero input', () => {
      const v: Vec3 = { x: 0, y: 0, z: 0 };
      const result = normalize(v);
      expect(result).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('add', () => {
    it('should add vectors', () => {
      const a: Vec3 = { x: 1, y: 2, z: 3 };
      const b: Vec3 = { x: 4, y: 5, z: 6 };
      expect(add(a, b)).toEqual({ x: 5, y: 7, z: 9 });
    });
  });

  describe('subtract', () => {
    it('should subtract vectors', () => {
      const a: Vec3 = { x: 5, y: 7, z: 9 };
      const b: Vec3 = { x: 4, y: 5, z: 6 };
      expect(subtract(a, b)).toEqual({ x: 1, y: 2, z: 3 });
    });
  });

  describe('scale', () => {
    it('should scale vector by scalar', () => {
      const v: Vec3 = { x: 1, y: 2, z: 3 };
      expect(scale(v, 2)).toEqual({ x: 2, y: 4, z: 6 });
    });

    it('should handle negative scalar', () => {
      const v: Vec3 = { x: 1, y: 2, z: 3 };
      expect(scale(v, -1)).toEqual({ x: -1, y: -2, z: -3 });
    });
  });

  describe('lerp', () => {
    it('should interpolate between vectors', () => {
      const a: Vec3 = { x: 0, y: 0, z: 0 };
      const b: Vec3 = { x: 10, y: 10, z: 10 };
      expect(lerp(a, b, 0.5)).toEqual({ x: 5, y: 5, z: 5 });
    });

    it('should return first vector at t=0', () => {
      const a: Vec3 = { x: 1, y: 2, z: 3 };
      const b: Vec3 = { x: 10, y: 20, z: 30 };
      expect(lerp(a, b, 0)).toEqual(a);
    });

    it('should return second vector at t=1', () => {
      const a: Vec3 = { x: 1, y: 2, z: 3 };
      const b: Vec3 = { x: 10, y: 20, z: 30 };
      expect(lerp(a, b, 1)).toEqual(b);
    });
  });

  describe('midpoint', () => {
    it('should compute midpoint', () => {
      const a: Vec3 = { x: 0, y: 0, z: 0 };
      const b: Vec3 = { x: 4, y: 6, z: 8 };
      expect(midpoint(a, b)).toEqual({ x: 2, y: 3, z: 4 });
    });
  });

  describe('angleBetween', () => {
    it('should return 0 for parallel vectors', () => {
      const a: Vec3 = { x: 1, y: 0, z: 0 };
      const b: Vec3 = { x: 2, y: 0, z: 0 };
      expect(angleBetween(a, b)).toBeCloseTo(0);
    });

    it('should return PI/2 for perpendicular vectors', () => {
      const a: Vec3 = { x: 1, y: 0, z: 0 };
      const b: Vec3 = { x: 0, y: 1, z: 0 };
      expect(angleBetween(a, b)).toBeCloseTo(Math.PI / 2);
    });

    it('should return PI for opposite vectors', () => {
      const a: Vec3 = { x: 1, y: 0, z: 0 };
      const b: Vec3 = { x: -1, y: 0, z: 0 };
      expect(angleBetween(a, b)).toBeCloseTo(Math.PI);
    });
  });
});

describe('Projection Functions', () => {
  describe('projectPointOnLine', () => {
    it('should project point onto line', () => {
      const point: Vec3 = { x: 1, y: 2, z: 0 };
      const lineStart: Vec3 = { x: 0, y: 0, z: 0 };
      const lineEnd: Vec3 = { x: 10, y: 0, z: 0 };
      const result = projectPointOnLine(point, lineStart, lineEnd);
      expect(result.x).toBeCloseTo(1);
      expect(result.y).toBeCloseTo(0);
      expect(result.z).toBeCloseTo(0);
    });

    it('should handle point on line', () => {
      const point: Vec3 = { x: 5, y: 0, z: 0 };
      const lineStart: Vec3 = { x: 0, y: 0, z: 0 };
      const lineEnd: Vec3 = { x: 10, y: 0, z: 0 };
      const result = projectPointOnLine(point, lineStart, lineEnd);
      expect(result).toEqual(point);
    });
  });

  describe('projectPointOnSegment', () => {
    it('should project point onto segment interior', () => {
      const point: Vec3 = { x: 5, y: 5, z: 0 };
      const segStart: Vec3 = { x: 0, y: 0, z: 0 };
      const segEnd: Vec3 = { x: 10, y: 0, z: 0 };
      const result = projectPointOnSegment(point, segStart, segEnd);
      expect(result.x).toBeCloseTo(5);
      expect(result.y).toBeCloseTo(0);
    });

    it('should clamp to segment start', () => {
      const point: Vec3 = { x: -5, y: 0, z: 0 };
      const segStart: Vec3 = { x: 0, y: 0, z: 0 };
      const segEnd: Vec3 = { x: 10, y: 0, z: 0 };
      const result = projectPointOnSegment(point, segStart, segEnd);
      expect(result).toEqual(segStart);
    });

    it('should clamp to segment end', () => {
      const point: Vec3 = { x: 15, y: 0, z: 0 };
      const segStart: Vec3 = { x: 0, y: 0, z: 0 };
      const segEnd: Vec3 = { x: 10, y: 0, z: 0 };
      const result = projectPointOnSegment(point, segStart, segEnd);
      expect(result).toEqual(segEnd);
    });
  });
});

describe('Triangle Functions', () => {
  const v0: Vec3 = { x: 0, y: 0, z: 0 };
  const v1: Vec3 = { x: 1, y: 0, z: 0 };
  const v2: Vec3 = { x: 0.5, y: Math.sqrt(3) / 2, z: 0 }; // Equilateral triangle

  describe('triangleArea', () => {
    it('should compute triangle area', () => {
      const area = triangleArea(v0, v1, v2);
      // Area of equilateral triangle with side 1 = sqrt(3)/4
      expect(area).toBeCloseTo(Math.sqrt(3) / 4);
    });

    it('should return 0 for degenerate triangle', () => {
      const degV2: Vec3 = { x: 0.5, y: 0, z: 0 };
      expect(triangleArea(v0, v1, degV2)).toBeCloseTo(0);
    });
  });

  describe('triangleNormal', () => {
    it('should compute normal pointing up for XY plane triangle', () => {
      const normal = triangleNormal(v0, v1, v2);
      expect(Math.abs(normal.z)).toBeCloseTo(1);
      expect(normal.x).toBeCloseTo(0);
      expect(normal.y).toBeCloseTo(0);
    });
  });

  describe('triangleCentroid', () => {
    it('should compute centroid', () => {
      const centroid = triangleCentroid(v0, v1, v2);
      expect(centroid.x).toBeCloseTo(0.5);
      expect(centroid.y).toBeCloseTo(Math.sqrt(3) / 6);
      expect(centroid.z).toBeCloseTo(0);
    });
  });

  describe('triangleCircumcenter', () => {
    it('should compute circumcenter for equilateral triangle', () => {
      const center = triangleCircumcenter(v0, v1, v2);
      expect(center).not.toBeNull();
      // For equilateral triangle, circumcenter = centroid
      expect(center!.x).toBeCloseTo(0.5);
      expect(center!.y).toBeCloseTo(Math.sqrt(3) / 6);
    });

    it('should return null for degenerate triangle', () => {
      const degV2: Vec3 = { x: 0.5, y: 0, z: 0 };
      expect(triangleCircumcenter(v0, v1, degV2)).toBeNull();
    });
  });

  describe('triangleCircumradius', () => {
    it('should compute circumradius', () => {
      const radius = triangleCircumradius(v0, v1, v2);
      expect(radius).not.toBeNull();
      // For equilateral triangle with side a, R = a/sqrt(3)
      expect(radius).toBeCloseTo(1 / Math.sqrt(3));
    });
  });

  describe('triangleInradius', () => {
    it('should compute inradius', () => {
      const radius = triangleInradius(v0, v1, v2);
      expect(radius).not.toBeNull();
      // For equilateral triangle with side a, r = a/(2*sqrt(3))
      expect(radius).toBeCloseTo(1 / (2 * Math.sqrt(3)));
    });
  });

  describe('triangleQuality', () => {
    it('should return 1.0 for equilateral triangle', () => {
      const quality = triangleQuality(v0, v1, v2);
      expect(quality).toBeCloseTo(1.0, 1);
    });

    it('should return lower value for elongated triangle', () => {
      const elongatedV2: Vec3 = { x: 0.5, y: 0.01, z: 0 };
      const quality = triangleQuality(v0, v1, elongatedV2);
      expect(quality).toBeLessThan(0.5);
    });

    it('should return 0 for degenerate triangle', () => {
      const degV2: Vec3 = { x: 0.5, y: 0, z: 0 };
      expect(triangleQuality(v0, v1, degV2)).toBe(0);
    });
  });

  describe('isPointInTriangle', () => {
    it('should return true for point inside triangle', () => {
      const centroid = triangleCentroid(v0, v1, v2);
      expect(isPointInTriangle(centroid, v0, v1, v2)).toBe(true);
    });

    it('should return true for point on edge', () => {
      const edgePoint: Vec3 = { x: 0.5, y: 0, z: 0 };
      expect(isPointInTriangle(edgePoint, v0, v1, v2)).toBe(true);
    });

    it('should return true for point on vertex', () => {
      expect(isPointInTriangle(v0, v0, v1, v2)).toBe(true);
    });

    it('should return false for point outside triangle', () => {
      const outside: Vec3 = { x: 2, y: 2, z: 0 };
      expect(isPointInTriangle(outside, v0, v1, v2)).toBe(false);
    });
  });

  describe('barycentricCoordinates', () => {
    it('should return (1, 0, 0) for first vertex', () => {
      const coords = barycentricCoordinates(v0, v0, v1, v2);
      expect(coords).not.toBeNull();
      expect(coords!.u).toBeCloseTo(1);
      expect(coords!.v).toBeCloseTo(0);
      expect(coords!.w).toBeCloseTo(0);
    });

    it('should return (1/3, 1/3, 1/3) for centroid', () => {
      const centroid = triangleCentroid(v0, v1, v2);
      const coords = barycentricCoordinates(centroid, v0, v1, v2);
      expect(coords).not.toBeNull();
      expect(coords!.u).toBeCloseTo(1 / 3);
      expect(coords!.v).toBeCloseTo(1 / 3);
      expect(coords!.w).toBeCloseTo(1 / 3);
    });
  });
});

describe('Quadrilateral Functions', () => {
  describe('isQuadConvex', () => {
    it('should return true for convex quadrilateral', () => {
      // Two triangles sharing edge v0-v1:
      // Triangle 1: (v0, v1, v2) - v2 is above the shared edge
      // Triangle 2: (v0, v3, v1) - v3 is below the shared edge
      // The quad v0-v2-v1-v3 should be convex
      const v0: Vec3 = { x: 0, y: 0, z: 0 };
      const v1: Vec3 = { x: 2, y: 0, z: 0 };
      const v2: Vec3 = { x: 1, y: 1, z: 0 }; // Above the edge
      const v3: Vec3 = { x: 1, y: -1, z: 0 }; // Below the edge
      expect(isQuadConvex(v0, v1, v2, v3)).toBe(true);
    });

    it('should return false for non-convex quadrilateral', () => {
      // Non-convex: v3 is on the same side as v2
      const v0: Vec3 = { x: 0, y: 0, z: 0 };
      const v1: Vec3 = { x: 2, y: 0, z: 0 };
      const v2: Vec3 = { x: 1, y: 1, z: 0 }; // Above the edge
      const v3: Vec3 = { x: 1, y: 0.5, z: 0 }; // Also above (same side) - not convex
      expect(isQuadConvex(v0, v1, v2, v3)).toBe(false);
    });
  });
});

describe('Angle Functions', () => {
  describe('cotangent', () => {
    it('should compute cotangent of angle at vertex', () => {
      // Right angle triangle
      const v0: Vec3 = { x: 1, y: 0, z: 0 };
      const vertex: Vec3 = { x: 0, y: 0, z: 0 };
      const v1: Vec3 = { x: 0, y: 1, z: 0 };
      // cot(90°) = 0
      expect(cotangent(v0, vertex, v1)).toBeCloseTo(0);
    });

    it('should compute cotangent for 45 degree angle', () => {
      const v0: Vec3 = { x: 1, y: 0, z: 0 };
      const vertex: Vec3 = { x: 0, y: 0, z: 0 };
      const v1: Vec3 = { x: 1, y: 1, z: 0 };
      // cot(45°) = 1
      expect(cotangent(v0, vertex, v1)).toBeCloseTo(1);
    });
  });

  describe('angleAtVertex', () => {
    it('should compute angle at vertex', () => {
      const v0: Vec3 = { x: 1, y: 0, z: 0 };
      const vertex: Vec3 = { x: 0, y: 0, z: 0 };
      const v1: Vec3 = { x: 0, y: 1, z: 0 };
      expect(angleAtVertex(v0, vertex, v1)).toBeCloseTo(Math.PI / 2);
    });

    it('should return 60 degrees for equilateral triangle vertex', () => {
      const v0: Vec3 = { x: 0, y: 0, z: 0 };
      const vertex: Vec3 = { x: 1, y: 0, z: 0 };
      const v2: Vec3 = { x: 0.5, y: Math.sqrt(3) / 2, z: 0 };
      expect(angleAtVertex(v0, vertex, v2)).toBeCloseTo(Math.PI / 3);
    });
  });
});
