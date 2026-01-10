import type { Vec3 } from '../geometry/GeometricUtils';
import { distanceSquared } from '../geometry/GeometricUtils';

/**
 * Axis-Aligned Bounding Box.
 */
export interface AABB {
  min: Vec3;
  max: Vec3;
}

/**
 * A triangle primitive for BVH.
 */
export interface Triangle {
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
  data?: unknown;
}

/**
 * Result of a closest point query.
 */
export interface ClosestPointResult {
  point: Vec3;
  distance: number;
  triangleIndex: number;
}

/**
 * BVH node for the tree structure.
 */
interface BVHNode {
  bounds: AABB;
  left?: BVHNode;
  right?: BVHNode;
  triangleIndices?: number[];
}

/**
 * Computes the AABB of a triangle.
 */
function triangleBounds(tri: Triangle): AABB {
  return {
    min: {
      x: Math.min(tri.v0.x, tri.v1.x, tri.v2.x),
      y: Math.min(tri.v0.y, tri.v1.y, tri.v2.y),
      z: Math.min(tri.v0.z, tri.v1.z, tri.v2.z),
    },
    max: {
      x: Math.max(tri.v0.x, tri.v1.x, tri.v2.x),
      y: Math.max(tri.v0.y, tri.v1.y, tri.v2.y),
      z: Math.max(tri.v0.z, tri.v1.z, tri.v2.z),
    },
  };
}

/**
 * Merges two AABBs.
 */
function mergeBounds(a: AABB, b: AABB): AABB {
  return {
    min: {
      x: Math.min(a.min.x, b.min.x),
      y: Math.min(a.min.y, b.min.y),
      z: Math.min(a.min.z, b.min.z),
    },
    max: {
      x: Math.max(a.max.x, b.max.x),
      y: Math.max(a.max.y, b.max.y),
      z: Math.max(a.max.z, b.max.z),
    },
  };
}

/**
 * Computes the centroid of a triangle.
 */
function triangleCentroid(tri: Triangle): Vec3 {
  return {
    x: (tri.v0.x + tri.v1.x + tri.v2.x) / 3,
    y: (tri.v0.y + tri.v1.y + tri.v2.y) / 3,
    z: (tri.v0.z + tri.v1.z + tri.v2.z) / 3,
  };
}

/**
 * Computes the squared distance from a point to an AABB.
 */
function pointToAABBDistanceSquared(point: Vec3, box: AABB): number {
  let distSq = 0;

  if (point.x < box.min.x) {
    distSq += (box.min.x - point.x) ** 2;
  } else if (point.x > box.max.x) {
    distSq += (point.x - box.max.x) ** 2;
  }

  if (point.y < box.min.y) {
    distSq += (box.min.y - point.y) ** 2;
  } else if (point.y > box.max.y) {
    distSq += (point.y - box.max.y) ** 2;
  }

  if (point.z < box.min.z) {
    distSq += (box.min.z - point.z) ** 2;
  } else if (point.z > box.max.z) {
    distSq += (point.z - box.max.z) ** 2;
  }

  return distSq;
}

/**
 * Computes the closest point on a triangle to a query point.
 */
function closestPointOnTriangle(point: Vec3, tri: Triangle): Vec3 {
  // Based on Real-Time Collision Detection by Christer Ericson

  const a = tri.v0;
  const b = tri.v1;
  const c = tri.v2;

  // Check if P in vertex region outside A
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const ap = { x: point.x - a.x, y: point.y - a.y, z: point.z - a.z };

  const d1 = ab.x * ap.x + ab.y * ap.y + ab.z * ap.z;
  const d2 = ac.x * ap.x + ac.y * ap.y + ac.z * ap.z;

  if (d1 <= 0 && d2 <= 0) return a; // Barycentric coordinates (1,0,0)

  // Check if P in vertex region outside B
  const bp = { x: point.x - b.x, y: point.y - b.y, z: point.z - b.z };
  const d3 = ab.x * bp.x + ab.y * bp.y + ab.z * bp.z;
  const d4 = ac.x * bp.x + ac.y * bp.y + ac.z * bp.z;

  if (d3 >= 0 && d4 <= d3) return b; // Barycentric coordinates (0,1,0)

  // Check if P in edge region of AB
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return { x: a.x + v * ab.x, y: a.y + v * ab.y, z: a.z + v * ab.z };
  }

  // Check if P in vertex region outside C
  const cp = { x: point.x - c.x, y: point.y - c.y, z: point.z - c.z };
  const d5 = ab.x * cp.x + ab.y * cp.y + ab.z * cp.z;
  const d6 = ac.x * cp.x + ac.y * cp.y + ac.z * cp.z;

  if (d6 >= 0 && d5 <= d6) return c; // Barycentric coordinates (0,0,1)

  // Check if P in edge region of AC
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return { x: a.x + w * ac.x, y: a.y + w * ac.y, z: a.z + w * ac.z };
  }

  // Check if P in edge region of BC
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return {
      x: b.x + w * (c.x - b.x),
      y: b.y + w * (c.y - b.y),
      z: b.z + w * (c.z - b.z),
    };
  }

  // P inside face region
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return {
    x: a.x + ab.x * v + ac.x * w,
    y: a.y + ab.y * v + ac.y * w,
    z: a.z + ab.z * v + ac.z * w,
  };
}

/**
 * Bounding Volume Hierarchy for fast spatial queries on triangle meshes.
 */
export class BVH {
  private root: BVHNode | null = null;
  private triangles: Triangle[] = [];
  private maxLeafSize: number;

  /**
   * Creates a new BVH.
   *
   * @param maxLeafSize - Maximum number of triangles per leaf node
   */
  constructor(maxLeafSize: number = 4) {
    this.maxLeafSize = maxLeafSize;
  }

  /**
   * Builds the BVH from an array of triangles.
   *
   * @param triangles - Array of triangles to build from
   */
  build(triangles: Triangle[]): void {
    this.triangles = triangles;

    if (triangles.length === 0) {
      this.root = null;
      return;
    }

    const indices = triangles.map((_, i) => i);
    this.root = this.buildNode(indices);
  }

  /**
   * Recursively builds a BVH node.
   */
  private buildNode(indices: number[]): BVHNode {
    // Compute bounds
    let bounds = triangleBounds(this.triangles[indices[0]!]!);
    for (let i = 1; i < indices.length; i++) {
      bounds = mergeBounds(bounds, triangleBounds(this.triangles[indices[i]!]!));
    }

    // Leaf node if small enough
    if (indices.length <= this.maxLeafSize) {
      return { bounds, triangleIndices: indices };
    }

    // Choose split axis (longest axis)
    const extents = {
      x: bounds.max.x - bounds.min.x,
      y: bounds.max.y - bounds.min.y,
      z: bounds.max.z - bounds.min.z,
    };

    let axis: 'x' | 'y' | 'z' = 'x';
    if (extents.y > extents.x && extents.y > extents.z) axis = 'y';
    else if (extents.z > extents.x && extents.z > extents.y) axis = 'z';

    // Sort by centroid along axis
    const centroids = indices.map((i) => ({
      index: i,
      centroid: triangleCentroid(this.triangles[i]!),
    }));

    centroids.sort((a, b) => a.centroid[axis] - b.centroid[axis]);

    // Split at median
    const mid = Math.floor(centroids.length / 2);
    const leftIndices = centroids.slice(0, mid).map((c) => c.index);
    const rightIndices = centroids.slice(mid).map((c) => c.index);

    // Handle degenerate case where all triangles have same centroid
    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return { bounds, triangleIndices: indices };
    }

    return {
      bounds,
      left: this.buildNode(leftIndices),
      right: this.buildNode(rightIndices),
    };
  }

  /**
   * Finds the closest point on the mesh to a query point.
   *
   * @param point - The query point
   * @returns The closest point result, or null if no triangles
   */
  closestPoint(point: Vec3): ClosestPointResult | null {
    if (!this.root || this.triangles.length === 0) {
      return null;
    }

    let bestResult: ClosestPointResult | null = null;
    let bestDistSq = Infinity;

    const stack: BVHNode[] = [this.root];

    while (stack.length > 0) {
      const node = stack.pop()!;

      // Check if this node could contain a closer point
      const boxDistSq = pointToAABBDistanceSquared(point, node.bounds);
      if (boxDistSq >= bestDistSq) {
        continue;
      }

      if (node.triangleIndices) {
        // Leaf node - check triangles
        for (const idx of node.triangleIndices) {
          const tri = this.triangles[idx]!;
          const closest = closestPointOnTriangle(point, tri);
          const distSq = distanceSquared(point, closest);

          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestResult = {
              point: closest,
              distance: Math.sqrt(distSq),
              triangleIndex: idx,
            };
          }
        }
      } else {
        // Internal node - add children to stack
        // Add farther child first so closer child is processed first
        if (node.left && node.right) {
          const leftDist = pointToAABBDistanceSquared(point, node.left.bounds);
          const rightDist = pointToAABBDistanceSquared(point, node.right.bounds);

          if (leftDist < rightDist) {
            stack.push(node.right);
            stack.push(node.left);
          } else {
            stack.push(node.left);
            stack.push(node.right);
          }
        } else if (node.left) {
          stack.push(node.left);
        } else if (node.right) {
          stack.push(node.right);
        }
      }
    }

    return bestResult;
  }

  /**
   * Finds all triangles intersecting a sphere.
   *
   * @param center - Center of the sphere
   * @param radius - Radius of the sphere
   * @returns Array of triangle indices
   */
  queryRadius(center: Vec3, radius: number): number[] {
    const results: number[] = [];
    const radiusSq = radius * radius;

    if (!this.root) {
      return results;
    }

    const stack: BVHNode[] = [this.root];

    while (stack.length > 0) {
      const node = stack.pop()!;

      // Check if sphere could intersect this node
      const boxDistSq = pointToAABBDistanceSquared(center, node.bounds);
      if (boxDistSq > radiusSq) {
        continue;
      }

      if (node.triangleIndices) {
        // Leaf node - check triangles
        for (const idx of node.triangleIndices) {
          const tri = this.triangles[idx]!;
          const closest = closestPointOnTriangle(center, tri);
          const distSq = distanceSquared(center, closest);

          if (distSq <= radiusSq) {
            results.push(idx);
          }
        }
      } else {
        // Internal node - add children
        if (node.left) stack.push(node.left);
        if (node.right) stack.push(node.right);
      }
    }

    return results;
  }

  /**
   * Gets the total number of triangles.
   */
  get triangleCount(): number {
    return this.triangles.length;
  }

  /**
   * Gets a triangle by index.
   */
  getTriangle(index: number): Triangle | undefined {
    return this.triangles[index];
  }
}

/**
 * Creates a BVH from a NonManifoldMesh.
 */
export function createBVHFromMesh(mesh: {
  getFaces(): Array<{
    getVertices(): [{ position: Vec3 }, { position: Vec3 }, { position: Vec3 }] | null;
  }>;
}): BVH {
  const triangles: Triangle[] = [];

  for (const face of mesh.getFaces()) {
    const verts = face.getVertices();
    if (!verts) continue;

    triangles.push({
      v0: { x: verts[0].position.x, y: verts[0].position.y, z: verts[0].position.z },
      v1: { x: verts[1].position.x, y: verts[1].position.y, z: verts[1].position.z },
      v2: { x: verts[2].position.x, y: verts[2].position.y, z: verts[2].position.z },
    });
  }

  const bvh = new BVH();
  bvh.build(triangles);
  return bvh;
}
