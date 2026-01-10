import type { Vector3 } from 'three';

/**
 * A simple 3D vector interface for internal computations.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Computes the squared distance between two points.
 */
export function distanceSquared(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Computes the Euclidean distance between two points.
 */
export function distance(a: Vec3, b: Vec3): number {
  return Math.sqrt(distanceSquared(a, b));
}

/**
 * Computes the dot product of two vectors.
 */
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Computes the cross product of two vectors.
 */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Computes the length of a vector.
 */
export function length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Computes the squared length of a vector.
 */
export function lengthSquared(v: Vec3): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

/**
 * Normalizes a vector to unit length.
 * Returns a zero vector if the input has zero length.
 */
export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len < 1e-10) {
    return { x: 0, y: 0, z: 0 };
  }
  return {
    x: v.x / len,
    y: v.y / len,
    z: v.z / len,
  };
}

/**
 * Adds two vectors.
 */
export function add(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

/**
 * Subtracts vector b from vector a.
 */
export function subtract(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

/**
 * Multiplies a vector by a scalar.
 */
export function scale(v: Vec3, s: number): Vec3 {
  return {
    x: v.x * s,
    y: v.y * s,
    z: v.z * s,
  };
}

/**
 * Linearly interpolates between two vectors.
 */
export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/**
 * Computes the midpoint between two points.
 */
export function midpoint(a: Vec3, b: Vec3): Vec3 {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

/**
 * Computes the angle between two vectors in radians.
 */
export function angleBetween(a: Vec3, b: Vec3): number {
  const lenA = length(a);
  const lenB = length(b);
  if (lenA < 1e-10 || lenB < 1e-10) {
    return 0;
  }
  const cosAngle = dot(a, b) / (lenA * lenB);
  // Clamp to [-1, 1] to handle numerical errors
  return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
}

/**
 * Projects a point onto a line defined by two points.
 * Returns the closest point on the line to the given point.
 */
export function projectPointOnLine(point: Vec3, lineStart: Vec3, lineEnd: Vec3): Vec3 {
  const lineDir = subtract(lineEnd, lineStart);
  const lineLengthSq = lengthSquared(lineDir);

  if (lineLengthSq < 1e-10) {
    return { ...lineStart };
  }

  const t = dot(subtract(point, lineStart), lineDir) / lineLengthSq;

  return add(lineStart, scale(lineDir, t));
}

/**
 * Projects a point onto a line segment defined by two endpoints.
 * Returns the closest point on the segment to the given point.
 */
export function projectPointOnSegment(point: Vec3, segStart: Vec3, segEnd: Vec3): Vec3 {
  const lineDir = subtract(segEnd, segStart);
  const lineLengthSq = lengthSquared(lineDir);

  if (lineLengthSq < 1e-10) {
    return { ...segStart };
  }

  const t = Math.max(0, Math.min(1, dot(subtract(point, segStart), lineDir) / lineLengthSq));

  return add(segStart, scale(lineDir, t));
}

/**
 * Computes the area of a triangle given three vertices.
 */
export function triangleArea(v0: Vec3, v1: Vec3, v2: Vec3): number {
  const e1 = subtract(v1, v0);
  const e2 = subtract(v2, v0);
  const crossProduct = cross(e1, e2);
  return length(crossProduct) / 2;
}

/**
 * Computes the normal of a triangle given three vertices.
 * Returns a normalized vector perpendicular to the triangle.
 */
export function triangleNormal(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
  const e1 = subtract(v1, v0);
  const e2 = subtract(v2, v0);
  return normalize(cross(e1, e2));
}

/**
 * Computes the centroid of a triangle.
 */
export function triangleCentroid(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 {
  return {
    x: (v0.x + v1.x + v2.x) / 3,
    y: (v0.y + v1.y + v2.y) / 3,
    z: (v0.z + v1.z + v2.z) / 3,
  };
}

/**
 * Computes the circumcenter of a triangle.
 * Returns the center of the circumscribed circle.
 */
export function triangleCircumcenter(v0: Vec3, v1: Vec3, v2: Vec3): Vec3 | null {
  const a = subtract(v1, v0);
  const b = subtract(v2, v0);
  const crossAB = cross(a, b);
  const denom = 2 * lengthSquared(crossAB);

  if (denom < 1e-10) {
    return null; // Degenerate triangle
  }

  const aLenSq = lengthSquared(a);
  const bLenSq = lengthSquared(b);

  const term1 = scale(cross(crossAB, a), bLenSq);
  const term2 = scale(cross(b, crossAB), aLenSq);
  const circumcenterOffset = scale(add(term1, term2), 1 / denom);

  return add(v0, circumcenterOffset);
}

/**
 * Computes the circumradius of a triangle.
 */
export function triangleCircumradius(v0: Vec3, v1: Vec3, v2: Vec3): number | null {
  const a = distance(v1, v2);
  const b = distance(v0, v2);
  const c = distance(v0, v1);

  const area = triangleArea(v0, v1, v2);
  if (area < 1e-10) {
    return null; // Degenerate triangle
  }

  return (a * b * c) / (4 * area);
}

/**
 * Computes the inradius of a triangle.
 */
export function triangleInradius(v0: Vec3, v1: Vec3, v2: Vec3): number | null {
  const a = distance(v1, v2);
  const b = distance(v0, v2);
  const c = distance(v0, v1);

  const s = (a + b + c) / 2; // Semi-perimeter
  const area = triangleArea(v0, v1, v2);

  if (s < 1e-10) {
    return null; // Degenerate triangle
  }

  return area / s;
}

/**
 * Computes the quality of a triangle (2 * inradius / circumradius).
 * Returns a value between 0 and 1, where 1 is an equilateral triangle.
 */
export function triangleQuality(v0: Vec3, v1: Vec3, v2: Vec3): number {
  const inr = triangleInradius(v0, v1, v2);
  const circumr = triangleCircumradius(v0, v1, v2);

  if (inr === null || circumr === null || circumr < 1e-10) {
    return 0;
  }

  return Math.max(0, Math.min(1, (2 * inr) / circumr));
}

/**
 * Checks if a point lies inside a triangle (using barycentric coordinates).
 */
export function isPointInTriangle(point: Vec3, v0: Vec3, v1: Vec3, v2: Vec3): boolean {
  const e0 = subtract(v1, v0);
  const e1 = subtract(v2, v0);
  const e2 = subtract(point, v0);

  const d00 = dot(e0, e0);
  const d01 = dot(e0, e1);
  const d11 = dot(e1, e1);
  const d20 = dot(e2, e0);
  const d21 = dot(e2, e1);

  const denom = d00 * d11 - d01 * d01;
  if (Math.abs(denom) < 1e-10) {
    return false; // Degenerate triangle
  }

  const v = (d11 * d20 - d01 * d21) / denom;
  const w = (d00 * d21 - d01 * d20) / denom;
  const u = 1 - v - w;

  return u >= 0 && v >= 0 && w >= 0;
}

/**
 * Computes the barycentric coordinates of a point with respect to a triangle.
 */
export function barycentricCoordinates(
  point: Vec3,
  v0: Vec3,
  v1: Vec3,
  v2: Vec3
): { u: number; v: number; w: number } | null {
  const e0 = subtract(v1, v0);
  const e1 = subtract(v2, v0);
  const e2 = subtract(point, v0);

  const d00 = dot(e0, e0);
  const d01 = dot(e0, e1);
  const d11 = dot(e1, e1);
  const d20 = dot(e2, e0);
  const d21 = dot(e2, e1);

  const denom = d00 * d11 - d01 * d01;
  if (Math.abs(denom) < 1e-10) {
    return null; // Degenerate triangle
  }

  const v = (d11 * d20 - d01 * d21) / denom;
  const w = (d00 * d21 - d01 * d20) / denom;
  const u = 1 - v - w;

  return { u, v, w };
}

/**
 * Checks if the quadrilateral formed by two adjacent triangles is convex.
 * Used to determine if an edge can be flipped.
 *
 * @param v0 - First vertex of the shared edge
 * @param v1 - Second vertex of the shared edge
 * @param v2 - Opposite vertex in first triangle
 * @param v3 - Opposite vertex in second triangle
 */
export function isQuadConvex(v0: Vec3, v1: Vec3, v2: Vec3, v3: Vec3): boolean {
  // Project to 2D using the average normal of the two triangles
  const n1 = triangleNormal(v0, v1, v2);
  const n2 = triangleNormal(v0, v3, v1);
  const normal = normalize(add(n1, n2));

  // Choose a coordinate system on the plane
  let tangent: Vec3;
  if (Math.abs(normal.x) < 0.9) {
    tangent = normalize(cross(normal, { x: 1, y: 0, z: 0 }));
  } else {
    tangent = normalize(cross(normal, { x: 0, y: 1, z: 0 }));
  }
  const bitangent = cross(normal, tangent);

  // Project vertices to 2D
  const project = (v: Vec3): { x: number; y: number } => ({
    x: dot(v, tangent),
    y: dot(v, bitangent),
  });

  const p0 = project(v0);
  const p1 = project(v1);
  const p2 = project(v2);
  const p3 = project(v3);

  // Check if the diagonal v2-v3 lies inside the quadrilateral
  // by checking if v2 and v3 are on opposite sides of v0-v1
  const cross2D = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
    a.x * b.y - a.y * b.x;

  const d01 = { x: p1.x - p0.x, y: p1.y - p0.y };
  const d02 = { x: p2.x - p0.x, y: p2.y - p0.y };
  const d03 = { x: p3.x - p0.x, y: p3.y - p0.y };

  const sign2 = cross2D(d01, d02);
  const sign3 = cross2D(d01, d03);

  // v2 and v3 should be on opposite sides of the edge v0-v1
  if (sign2 * sign3 >= 0) {
    return false;
  }

  // Also check that v0 and v1 are on opposite sides of v2-v3
  const d23 = { x: p3.x - p2.x, y: p3.y - p2.y };
  const d20 = { x: p0.x - p2.x, y: p0.y - p2.y };
  const d21 = { x: p1.x - p2.x, y: p1.y - p2.y };

  const sign0 = cross2D(d23, d20);
  const sign1 = cross2D(d23, d21);

  return sign0 * sign1 < 0;
}

/**
 * Converts a Three.js Vector3 to a Vec3 interface.
 */
export function fromVector3(v: Vector3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

/**
 * Computes the cotangent of the angle at a vertex in a triangle.
 * Used for computing Laplacian weights.
 */
export function cotangent(v0: Vec3, vertex: Vec3, v1: Vec3): number {
  const e0 = subtract(v0, vertex);
  const e1 = subtract(v1, vertex);

  const cosAngle = dot(e0, e1);
  const sinAngle = length(cross(e0, e1));

  if (Math.abs(sinAngle) < 1e-10) {
    return 0; // Degenerate case
  }

  return cosAngle / sinAngle;
}

/**
 * Computes the angle at a vertex in a triangle.
 */
export function angleAtVertex(v0: Vec3, vertex: Vec3, v1: Vec3): number {
  const e0 = subtract(v0, vertex);
  const e1 = subtract(v1, vertex);
  return angleBetween(e0, e1);
}
