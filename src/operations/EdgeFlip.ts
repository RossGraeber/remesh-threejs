import type { NonManifoldMesh } from '../core/NonManifoldMesh';
import type { Edge } from '../core/Edge';
import type { Vec3 } from '../geometry/GeometricUtils';
import { isQuadConvex, distance } from '../geometry/GeometricUtils';

/**
 * Result of an edge flip operation.
 */
export interface EdgeFlipResult {
  /** Whether the flip was successful */
  success: boolean;

  /** Reason for failure (if any) */
  reason?: string;

  /** The new edge length after flip */
  newLength?: number;
}

/**
 * Checks if an edge can be flipped.
 *
 * An edge can be flipped if:
 * 1. It has exactly 2 adjacent faces (not boundary, not non-manifold)
 * 2. It is not a skeleton edge
 * 3. Both endpoint vertices have degree > 1
 * 4. The quadrilateral formed is convex
 */
export function canFlipEdge(edge: Edge): boolean {
  // Must not be a skeleton edge
  if (edge.isSkeletonEdge()) {
    return false;
  }

  // Basic flip check
  if (!edge.canFlip()) {
    return false;
  }

  // Get the quadrilateral vertices
  const quad = getQuadVertices(edge);
  if (!quad) {
    return false;
  }

  // Check convexity
  return isQuadConvex(quad.v0, quad.v1, quad.v2, quad.v3);
}

/**
 * Gets the four vertices forming the quadrilateral around an edge.
 *
 * Returns vertices in order: v0, v1 (edge endpoints), v2, v3 (opposite vertices)
 */
function getQuadVertices(edge: Edge): { v0: Vec3; v1: Vec3; v2: Vec3; v3: Vec3 } | null {
  const h = edge.halfedge;
  const hTwin = h.twin;

  if (!hTwin || !h.face || !hTwin.face) {
    return null;
  }

  const hNext = h.next;
  const hTwinNext = hTwin.next;

  if (!hNext || !hTwinNext) {
    return null;
  }

  const v0 = hTwin.vertex; // Edge start
  const v1 = h.vertex; // Edge end
  const v2 = hNext.vertex; // Opposite in face 0
  const v3 = hTwinNext.vertex; // Opposite in face 1

  return {
    v0: { x: v0.position.x, y: v0.position.y, z: v0.position.z },
    v1: { x: v1.position.x, y: v1.position.y, z: v1.position.z },
    v2: { x: v2.position.x, y: v2.position.y, z: v2.position.z },
    v3: { x: v3.position.x, y: v3.position.y, z: v3.position.z },
  };
}

/**
 * Flips an edge in the mesh.
 *
 * Before flip (edge connects vA to vB):
 *
 *         vC
 *        /|\
 *       / | \
 *      /  |  \
 *     / f0|   \
 *   vA----|----vB
 *     \ f1|   /
 *      \  |  /
 *       \ | /
 *        \|/
 *        vD
 *
 * After flip (edge connects vC to vD):
 *
 *         vC
 *        / \
 *       / f0\
 *      /     \
 *     /       \
 *   vA---------vB
 *     \       /
 *      \  f1 /
 *       \   /
 *        \ /
 *        vD
 */
export function flipEdge(_mesh: NonManifoldMesh, edge: Edge): EdgeFlipResult {
  // Check if edge can be flipped
  if (!canFlipEdge(edge)) {
    return { success: false, reason: 'Edge cannot be flipped' };
  }

  const h = edge.halfedge;
  const hTwin = h.twin;

  if (!hTwin) {
    return { success: false, reason: 'Edge has no twin' };
  }

  // Get the 4 surrounding halfedges
  const hNext = h.next!;
  const hPrev = h.prev!;
  const hTwinNext = hTwin.next!;
  const hTwinPrev = hTwin.prev!;

  // Get the 4 vertices
  const vA = hTwin.vertex;
  const vB = h.vertex;
  const vC = hNext.vertex;
  const vD = hTwinNext.vertex;

  // Get faces
  const f0 = h.face;
  const f1 = hTwin.face;

  if (!f0 || !f1) {
    return { success: false, reason: 'Missing faces' };
  }

  // Update edge length (new edge connects vC to vD)
  const newLength = distance(
    { x: vC.position.x, y: vC.position.y, z: vC.position.z },
    { x: vD.position.x, y: vD.position.y, z: vD.position.z }
  );
  edge.length = newLength;

  // Update halfedge targets
  h.vertex = vD;
  hTwin.vertex = vC;

  // Set up face f0 cycle: h -> hTwinPrev -> hNext -> h
  h.next = hTwinPrev;
  h.prev = hNext;
  hTwinPrev.next = hNext;
  hTwinPrev.prev = h;
  hNext.next = h;
  hNext.prev = hTwinPrev;

  // Set up face f1 cycle: hTwin -> hPrev -> hTwinNext -> hTwin
  hTwin.next = hPrev;
  hTwin.prev = hTwinNext;
  hPrev.next = hTwinNext;
  hPrev.prev = hTwin;
  hTwinNext.next = hTwin;
  hTwinNext.prev = hPrev;

  // Update face assignments
  h.face = f0;
  hTwinPrev.face = f0;
  hNext.face = f0;

  hTwin.face = f1;
  hPrev.face = f1;
  hTwinNext.face = f1;

  // Update face halfedges
  f0.halfedge = h;
  f1.halfedge = hTwin;

  // Update vertex halfedges if they pointed to the flipped edge
  if (vA.halfedge === h) {
    vA.halfedge = hTwinNext;
  }
  if (vB.halfedge === hTwin) {
    vB.halfedge = hNext;
  }

  return { success: true, newLength };
}

/**
 * Checks if an edge satisfies the Delaunay condition.
 * An edge is Delaunay if the sum of opposite angles is <= 180 degrees.
 */
export function isDelaunay(edge: Edge): boolean {
  const h = edge.halfedge;
  const hTwin = h.twin;

  if (!hTwin || !h.face || !hTwin.face) {
    return true; // Boundary edges are always Delaunay
  }

  // Get the quadrilateral vertices
  const quad = getQuadVertices(edge);
  if (!quad) {
    return true;
  }

  // Compute opposite angles using law of cosines
  const angle0 = computeAngle(quad.v2, quad.v0, quad.v1);
  const angle1 = computeAngle(quad.v3, quad.v0, quad.v1);

  // Delaunay condition: sum of opposite angles <= π
  return angle0 + angle1 <= Math.PI + 1e-10;
}

/**
 * Computes the angle at vertex v0 in triangle (v0, v1, v2).
 */
function computeAngle(v0: Vec3, v1: Vec3, v2: Vec3): number {
  const dx1 = v1.x - v0.x;
  const dy1 = v1.y - v0.y;
  const dz1 = v1.z - v0.z;

  const dx2 = v2.x - v0.x;
  const dy2 = v2.y - v0.y;
  const dz2 = v2.z - v0.z;

  const dot = dx1 * dx2 + dy1 * dy2 + dz1 * dz2;
  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1 + dz1 * dz1);
  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2);

  if (len1 < 1e-10 || len2 < 1e-10) {
    return 0;
  }

  const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)));
  return Math.acos(cosAngle);
}

/**
 * Performs Delaunay flips on the mesh.
 * Returns the number of flips performed.
 */
export function makeDelaunay(mesh: NonManifoldMesh, maxIterations?: number): number {
  const edges = mesh.getEdges();
  const maxIter = maxIterations ?? edges.length * 10;

  let flipCount = 0;
  let iteration = 0;

  while (iteration < maxIter) {
    iteration++;
    let flippedAny = false;

    for (const edge of edges) {
      if (!isDelaunay(edge) && canFlipEdge(edge)) {
        const result = flipEdge(mesh, edge);
        if (result.success) {
          flipCount++;
          flippedAny = true;
        }
      }
    }

    if (!flippedAny) {
      break;
    }
  }

  return flipCount;
}

/**
 * Edge flip operation handler.
 */
export class EdgeFlipper {
  private mesh: NonManifoldMesh;

  constructor(mesh: NonManifoldMesh) {
    this.mesh = mesh;
  }

  /**
   * Flips an edge.
   */
  flip(edge: Edge): EdgeFlipResult {
    return flipEdge(this.mesh, edge);
  }

  /**
   * Checks if an edge can be flipped.
   */
  canFlip(edge: Edge): boolean {
    return canFlipEdge(edge);
  }

  /**
   * Checks if an edge satisfies the Delaunay condition.
   */
  isDelaunay(edge: Edge): boolean {
    return isDelaunay(edge);
  }

  /**
   * Makes the mesh Delaunay by flipping non-Delaunay edges.
   */
  makeDelaunay(maxIterations?: number): number {
    return makeDelaunay(this.mesh, maxIterations);
  }
}
