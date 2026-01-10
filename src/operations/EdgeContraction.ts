import type { NonManifoldMesh } from '../core/NonManifoldMesh';
import type { Edge } from '../core/Edge';
import type { Vertex } from '../core/Vertex';
import type { Face } from '../core/Face';
import { VertexType } from '../types/SkeletonData';
import { midpoint } from '../geometry/GeometricUtils';

/**
 * Result of an edge contraction operation.
 */
export interface EdgeContractionResult {
  /** Whether the contraction was successful */
  success: boolean;

  /** Reason for failure (if any) */
  reason?: string;

  /** The remaining vertex after contraction */
  remainingVertex?: Vertex;

  /** Faces that were removed */
  removedFaces?: Face[];
}

/**
 * Checks if an edge can be contracted.
 *
 * An edge can be contracted if:
 * 1. Neither endpoint is a fixed vertex (branching or non-manifold other)
 * 2. Contracting won't create invalid topology
 * 3. The edge is not the only edge connecting two regions
 */
export function canContractEdge(edge: Edge): boolean {
  const [v0, v1] = edge.getVertices();
  if (!v0 || !v1) {
    return false;
  }

  // Check vertex types
  if (v0.type === VertexType.SkeletonBranching || v0.type === VertexType.NonManifoldOther) {
    // Can only contract if v1 is also not fixed
    if (v1.type === VertexType.SkeletonBranching || v1.type === VertexType.NonManifoldOther) {
      return false; // Both fixed
    }
  }

  if (v1.type === VertexType.SkeletonBranching || v1.type === VertexType.NonManifoldOther) {
    // v0 must not be fixed (already checked)
  }

  // Check if contraction would create invalid topology
  // (Link condition: intersection of vertex links should only contain the edge vertices)
  if (!checkLinkCondition(v0, v1)) {
    return false;
  }

  return true;
}

/**
 * Checks the link condition for edge contraction.
 * The link of a vertex is the set of vertices connected to it.
 * For valid contraction, link(v0) ∩ link(v1) should equal the edge endpoints.
 */
function checkLinkCondition(v0: Vertex, v1: Vertex): boolean {
  const link0 = new Set<number>();
  const link1 = new Set<number>();

  v0.forEachNeighbor((v) => {
    link0.add(v.id as number);
  });

  v1.forEachNeighbor((v) => {
    link1.add(v.id as number);
  });

  // Count common neighbors (excluding v0 and v1 themselves)
  let commonCount = 0;
  for (const id of link0) {
    if (id !== (v0.id as number) && id !== (v1.id as number) && link1.has(id)) {
      commonCount++;
    }
  }

  // For a valid edge contraction in a triangle mesh:
  // - Interior edge: common neighbors should be exactly 2 (the opposite vertices of the two triangles)
  // - Boundary edge: common neighbors should be exactly 1

  const faces = getSharedFaces(v0, v1);
  const expectedCommon = faces.length;

  return commonCount <= expectedCommon;
}

/**
 * Gets faces shared by two vertices.
 */
function getSharedFaces(v0: Vertex, v1: Vertex): Face[] {
  const faces0 = new Set<number>();
  const sharedFaces: Face[] = [];

  v0.forEachOutgoingHalfedge((he) => {
    if (he.face) {
      faces0.add(he.face.id as number);
    }
  });

  v1.forEachOutgoingHalfedge((he) => {
    if (he.face && faces0.has(he.face.id as number)) {
      sharedFaces.push(he.face);
    }
  });

  return sharedFaces;
}

/**
 * Contracts an edge, merging its two endpoints into one vertex.
 *
 * The resulting vertex position depends on vertex types:
 * - If one is fixed and one is movable: keep the fixed position
 * - If both are movable: use midpoint
 * - If one is on skeleton: use skeleton-constrained position
 */
export function contractEdge(mesh: NonManifoldMesh, edge: Edge): EdgeContractionResult {
  if (!canContractEdge(edge)) {
    return { success: false, reason: 'Edge cannot be contracted' };
  }

  const [v0, v1] = edge.getVertices();
  if (!v0 || !v1) {
    return { success: false, reason: 'Edge has no vertices' };
  }

  // Determine which vertex to keep and what position to use
  const { keepVertex, removeVertex, newPosition } = determineContractionResult(v0, v1);

  // Update the kept vertex position
  keepVertex.position.set(newPosition.x, newPosition.y, newPosition.z);

  // Get faces that will be removed (the triangles incident to the edge)
  const removedFaces = getSharedFaces(v0, v1);

  // Redirect all halfedges from removeVertex to keepVertex
  redirectHalfedges(removeVertex, keepVertex);

  // Remove the collapsed faces from the mesh
  for (const face of removedFaces) {
    mesh.faces.delete(face.id);
  }

  // Remove the contracted edge
  mesh.edges.delete(edge.id);

  // Remove halfedges associated with the edge
  for (const he of edge.allHalfedges) {
    mesh.halfedges.delete(he.id);
  }

  // Remove the vertex
  mesh.vertices.delete(removeVertex.id);

  // Update keepVertex's halfedge if needed
  if (keepVertex.halfedge && !mesh.halfedges.has(keepVertex.halfedge.id)) {
    // Find a valid halfedge
    for (const he of mesh.halfedges.values()) {
      if (he.getSourceVertex()?.id === keepVertex.id) {
        keepVertex.halfedge = he;
        break;
      }
    }
  }

  // Reclassify vertices
  mesh.classifyVertices();

  return { success: true, remainingVertex: keepVertex, removedFaces };
}

/**
 * Determines which vertex to keep and the new position after contraction.
 */
function determineContractionResult(
  v0: Vertex,
  v1: Vertex
): { keepVertex: Vertex; removeVertex: Vertex; newPosition: { x: number; y: number; z: number } } {
  // Priority: Fixed > OpenBook > Manifold
  const priority = (v: Vertex): number => {
    switch (v.type) {
      case VertexType.SkeletonBranching:
      case VertexType.NonManifoldOther:
        return 3;
      case VertexType.OpenBook:
        return 2;
      case VertexType.Manifold:
        return 1;
      default:
        return 0;
    }
  };

  const p0 = priority(v0);
  const p1 = priority(v1);

  let keepVertex: Vertex;
  let removeVertex: Vertex;
  let newPosition: { x: number; y: number; z: number };

  if (p0 >= p1) {
    keepVertex = v0;
    removeVertex = v1;
  } else {
    keepVertex = v1;
    removeVertex = v0;
  }

  // Determine position
  if (
    keepVertex.type === VertexType.SkeletonBranching ||
    keepVertex.type === VertexType.NonManifoldOther
  ) {
    // Fixed vertex: keep its position
    newPosition = {
      x: keepVertex.position.x,
      y: keepVertex.position.y,
      z: keepVertex.position.z,
    };
  } else if (keepVertex.type === VertexType.OpenBook && removeVertex.type === VertexType.Manifold) {
    // Keep the skeleton vertex position
    newPosition = {
      x: keepVertex.position.x,
      y: keepVertex.position.y,
      z: keepVertex.position.z,
    };
  } else {
    // Use midpoint
    newPosition = midpoint(
      { x: v0.position.x, y: v0.position.y, z: v0.position.z },
      { x: v1.position.x, y: v1.position.y, z: v1.position.z }
    );
  }

  return { keepVertex, removeVertex, newPosition };
}

/**
 * Redirects all halfedges from one vertex to another.
 */
function redirectHalfedges(fromVertex: Vertex, toVertex: Vertex): void {
  fromVertex.forEachOutgoingHalfedge((he) => {
    // Update the twin's vertex (since outgoing halfedge's source is fromVertex)
    if (he.twin) {
      he.twin.vertex = toVertex;
    }
  });
}

/**
 * Contracts all edges shorter than a threshold.
 */
export function contractShortEdges(
  mesh: NonManifoldMesh,
  minLength: number
): { contractCount: number; removedVertices: number } {
  let contractCount = 0;
  let removedVertices = 0;

  // Collect edges to contract (iterate over a copy since we're modifying)
  let edgesToContract: Edge[] = [];
  for (const edge of mesh.getEdges()) {
    if (edge.length < minLength && canContractEdge(edge)) {
      edgesToContract.push(edge);
    }
  }

  // Contract edges one at a time (order matters since contractions affect neighbors)
  while (edgesToContract.length > 0) {
    const edge = edgesToContract.pop()!;

    // Check if edge still exists and can be contracted
    if (!mesh.edges.has(edge.id) || !canContractEdge(edge)) {
      continue;
    }

    const result = contractEdge(mesh, edge);
    if (result.success) {
      contractCount++;
      removedVertices++;
    }
  }

  return { contractCount, removedVertices };
}

/**
 * Edge contraction operation handler.
 */
export class EdgeContractor {
  private mesh: NonManifoldMesh;

  constructor(mesh: NonManifoldMesh) {
    this.mesh = mesh;
  }

  /**
   * Contracts an edge.
   */
  contract(edge: Edge): EdgeContractionResult {
    return contractEdge(this.mesh, edge);
  }

  /**
   * Checks if an edge can be contracted.
   */
  canContract(edge: Edge): boolean {
    return canContractEdge(edge);
  }

  /**
   * Contracts all edges shorter than a threshold.
   */
  contractShortEdges(minLength: number): { contractCount: number; removedVertices: number } {
    return contractShortEdges(this.mesh, minLength);
  }

  /**
   * Checks if an edge should be contracted based on target length.
   */
  shouldContract(edge: Edge, targetLength: number, minRatio: number = 0.4): boolean {
    return edge.length < targetLength * minRatio;
  }
}
