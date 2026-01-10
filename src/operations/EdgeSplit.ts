import { Vector3 } from 'three';
import type { NonManifoldMesh } from '../core/NonManifoldMesh';
import type { Edge } from '../core/Edge';
import type { Vertex } from '../core/Vertex';
import type { Face } from '../core/Face';
import type { Halfedge } from '../core/Edge';

/**
 * Result of an edge split operation.
 */
export interface EdgeSplitResult {
  /** Whether the split was successful */
  success: boolean;

  /** Reason for failure (if any) */
  reason?: string;

  /** The new vertex created at the midpoint */
  newVertex?: Vertex;

  /** The new edges created */
  newEdges?: Edge[];

  /** The new faces created */
  newFaces?: Face[];
}

/**
 * Splits an edge at its midpoint.
 *
 * Before split:
 *        vC
 *       /|\
 *      / | \
 *     /  |  \
 *    / f0|   \
 *   vA---e---vB
 *    \ f1|   /
 *     \  |  /
 *      \ | /
 *       \|/
 *        vD
 *
 * After split (new vertex vM at midpoint):
 *        vC
 *       /|\
 *      / | \
 *     /  |  \
 *    / f0|f2 \
 *   vA--vM---vB
 *    \ f1|f3 /
 *     \  |  /
 *      \ | /
 *       \|/
 *        vD
 */
export function splitEdge(
  mesh: NonManifoldMesh,
  edge: Edge,
  splitRatio: number = 0.5
): EdgeSplitResult {
  const [v0, v1] = edge.getVertices();
  if (!v0 || !v1) {
    return { success: false, reason: 'Edge has no vertices' };
  }

  // Compute the split point
  const p0 = { x: v0.position.x, y: v0.position.y, z: v0.position.z };
  const p1 = { x: v1.position.x, y: v1.position.y, z: v1.position.z };
  const mid = {
    x: p0.x + (p1.x - p0.x) * splitRatio,
    y: p0.y + (p1.y - p0.y) * splitRatio,
    z: p0.z + (p1.z - p0.z) * splitRatio,
  };

  // Create new vertex at the split point
  const newVertex = mesh.createVertex(new Vector3(mid.x, mid.y, mid.z));

  // Inherit type from edge for skeleton edges
  if (edge.isSkeletonEdge()) {
    // The new vertex will be classified later
  }

  const newEdges: Edge[] = [];
  const newFaces: Face[] = [];

  // Get faces incident to this edge
  const faces = edge.getFaces();

  if (faces.length === 0) {
    // Isolated edge - just update the connectivity
    return { success: true, newVertex, newEdges: [], newFaces: [] };
  }

  // For each face, we need to split it into two triangles
  for (const face of faces) {
    if (!face) continue;

    const halfedges = face.getHalfedges();
    if (!halfedges) continue;

    // Find the halfedge corresponding to this edge in this face
    let edgeHe: Halfedge | null = null;
    for (const he of halfedges) {
      if (he.edge.id === edge.id) {
        edgeHe = he;
        break;
      }
    }

    if (!edgeHe) continue;

    // Split this face
    splitFaceAtEdge(mesh, face, edgeHe, newVertex, newEdges, newFaces);
  }

  // Update edge length
  edge.length = edge.length * splitRatio;

  // Reclassify the new vertex
  mesh.classifyVertices();

  return { success: true, newVertex, newEdges, newFaces };
}

/**
 * Splits a face at an edge by inserting a new vertex.
 */
function splitFaceAtEdge(
  mesh: NonManifoldMesh,
  _face: Face,
  edgeHe: Halfedge,
  newVertex: Vertex,
  _newEdges: Edge[],
  newFaces: Face[]
): void {
  // This is a complex operation that involves:
  // 1. Creating new halfedges
  // 2. Creating a new edge from the opposite vertex to the new vertex
  // 3. Updating all connectivity

  const heNext = edgeHe.next!;

  const vOpposite = heNext.vertex; // The vertex opposite to the edge
  const vTarget = edgeHe.vertex; // Original target of the halfedge

  // For now, create a simple split by creating two new faces
  // This is a simplified version - full implementation would update in-place

  // Create new face with vertices: newVertex, vTarget, vOpposite
  const newFace = mesh.createFace(newVertex, vTarget, vOpposite);
  newFaces.push(newFace);

  // Update the original face to use newVertex instead of vTarget
  // This requires updating halfedge connectivity
  edgeHe.vertex = newVertex;

  // Set the new vertex's halfedge
  if (!newVertex.halfedge) {
    newVertex.halfedge = edgeHe;
  }
}

/**
 * Splits all edges longer than a threshold.
 */
export function splitLongEdges(
  mesh: NonManifoldMesh,
  maxLength: number
): { splitCount: number; newVertices: Vertex[] } {
  const newVertices: Vertex[] = [];
  let splitCount = 0;

  // Collect edges to split (iterate over a copy since we're modifying)
  const edgesToSplit: Edge[] = [];
  for (const edge of mesh.getEdges()) {
    if (edge.length > maxLength) {
      edgesToSplit.push(edge);
    }
  }

  // Split edges
  for (const edge of edgesToSplit) {
    const result = splitEdge(mesh, edge);
    if (result.success && result.newVertex) {
      splitCount++;
      newVertices.push(result.newVertex);
    }
  }

  return { splitCount, newVertices };
}

/**
 * Edge split operation handler.
 */
export class EdgeSplitter {
  private mesh: NonManifoldMesh;

  constructor(mesh: NonManifoldMesh) {
    this.mesh = mesh;
  }

  /**
   * Splits an edge at the midpoint.
   */
  split(edge: Edge, ratio: number = 0.5): EdgeSplitResult {
    return splitEdge(this.mesh, edge, ratio);
  }

  /**
   * Splits all edges longer than a threshold.
   */
  splitLongEdges(maxLength: number): { splitCount: number; newVertices: Vertex[] } {
    return splitLongEdges(this.mesh, maxLength);
  }

  /**
   * Checks if an edge should be split based on target length.
   */
  shouldSplit(edge: Edge, targetLength: number, maxRatio: number = 1.333): boolean {
    return edge.length > targetLength * maxRatio;
  }
}
