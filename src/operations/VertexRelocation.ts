import type { NonManifoldMesh } from '../core/NonManifoldMesh';
import type { Vertex } from '../core/Vertex';
import type { SkeletonConstraints } from '../skeleton/SkeletonConstraints';
import type { Vec3 } from '../geometry/GeometricUtils';
import { VertexType } from '../types/SkeletonData';
import { add, subtract, scale, normalize, dot, distance } from '../geometry/GeometricUtils';

/**
 * Result of a vertex relocation operation.
 */
export interface VertexRelocationResult {
  /** Whether the relocation was successful */
  success: boolean;

  /** Reason for failure (if any) */
  reason?: string;

  /** The new position */
  newPosition?: Vec3;

  /** Whether the position was constrained */
  wasConstrained?: boolean;

  /** Distance moved */
  distanceMoved?: number;
}

/**
 * Computes the target position for a vertex using tangential smoothing.
 * This projects the barycenter of neighbors onto the tangent plane.
 */
export function computeTangentialSmoothing(vertex: Vertex): Vec3 | null {
  const neighbors = vertex.getNeighbors();
  if (neighbors.length === 0) {
    return null;
  }

  // Compute barycenter of neighbors
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const n of neighbors) {
    cx += n.position.x;
    cy += n.position.y;
    cz += n.position.z;
  }
  cx /= neighbors.length;
  cy /= neighbors.length;
  cz /= neighbors.length;

  const barycenter = { x: cx, y: cy, z: cz };

  // Compute vertex normal (average of incident face normals)
  const normal = computeVertexNormal(vertex);
  if (!normal) {
    return barycenter;
  }

  // Project barycenter onto tangent plane
  const vertexPos = { x: vertex.position.x, y: vertex.position.y, z: vertex.position.z };
  const toBarycenter = subtract(barycenter, vertexPos);
  const normalComponent = scale(normal, dot(toBarycenter, normal));
  const tangentComponent = subtract(toBarycenter, normalComponent);

  return add(vertexPos, tangentComponent);
}

/**
 * Computes the vertex normal by averaging incident face normals.
 */
function computeVertexNormal(vertex: Vertex): Vec3 | null {
  let nx = 0,
    ny = 0,
    nz = 0;
  let count = 0;

  vertex.forEachOutgoingHalfedge((he) => {
    if (he.face) {
      const faceNormal = he.face.getNormal();
      if (faceNormal) {
        nx += faceNormal.x;
        ny += faceNormal.y;
        nz += faceNormal.z;
        count++;
      }
    }
  });

  if (count === 0) {
    return null;
  }

  return normalize({ x: nx / count, y: ny / count, z: nz / count });
}

/**
 * Relocates a vertex to a target position, respecting constraints.
 */
export function relocateVertex(
  _mesh: NonManifoldMesh,
  vertex: Vertex,
  targetPosition: Vec3,
  constraints?: SkeletonConstraints
): VertexRelocationResult {
  // Check if vertex can move
  if (vertex.type === VertexType.SkeletonBranching || vertex.type === VertexType.NonManifoldOther) {
    return { success: false, reason: 'Vertex is fixed' };
  }

  const currentPos = { x: vertex.position.x, y: vertex.position.y, z: vertex.position.z };
  let finalPosition = targetPosition;
  let wasConstrained = false;

  // Apply skeleton constraints if available
  if (constraints) {
    const constrained = constraints.constrainPosition(vertex, targetPosition);
    finalPosition = constrained.position;
    wasConstrained = constrained.wasConstrained;
  }

  // Check if the move would create invalid geometry
  if (!isValidRelocation(vertex, finalPosition)) {
    return { success: false, reason: 'Relocation would create invalid geometry' };
  }

  // Apply the relocation
  vertex.position.set(finalPosition.x, finalPosition.y, finalPosition.z);

  // Update incident edge lengths
  updateIncidentEdgeLengths(vertex);

  const distanceMoved = distance(currentPos, finalPosition);

  return {
    success: true,
    newPosition: finalPosition,
    wasConstrained,
    distanceMoved,
  };
}

/**
 * Checks if a vertex relocation would create invalid geometry.
 */
function isValidRelocation(vertex: Vertex, newPosition: Vec3): boolean {
  // Check for face inversions (normals flipping)
  const originalPos = { x: vertex.position.x, y: vertex.position.y, z: vertex.position.z };

  // Temporarily move vertex
  vertex.position.set(newPosition.x, newPosition.y, newPosition.z);

  let isValid = true;

  vertex.forEachOutgoingHalfedge((he) => {
    if (he.face) {
      const area = he.face.getArea();
      if (area !== null && area < 1e-10) {
        isValid = false; // Degenerate triangle
      }
    }
  });

  // Restore original position
  vertex.position.set(originalPos.x, originalPos.y, originalPos.z);

  return isValid;
}

/**
 * Updates the lengths of all edges incident to a vertex.
 */
function updateIncidentEdgeLengths(vertex: Vertex): void {
  vertex.forEachOutgoingHalfedge((he) => {
    const source = he.getSourceVertex();
    if (source) {
      he.edge.length = distance(
        { x: source.position.x, y: source.position.y, z: source.position.z },
        { x: he.vertex.position.x, y: he.vertex.position.y, z: he.vertex.position.z }
      );
    }
  });
}

/**
 * Applies tangential smoothing to a vertex.
 */
export function smoothVertex(
  mesh: NonManifoldMesh,
  vertex: Vertex,
  constraints?: SkeletonConstraints,
  dampingFactor: number = 0.5
): VertexRelocationResult {
  const target = computeTangentialSmoothing(vertex);
  if (!target) {
    return { success: false, reason: 'Cannot compute smoothing target' };
  }

  // Apply damping
  const currentPos = { x: vertex.position.x, y: vertex.position.y, z: vertex.position.z };
  const dampedTarget = {
    x: currentPos.x + (target.x - currentPos.x) * dampingFactor,
    y: currentPos.y + (target.y - currentPos.y) * dampingFactor,
    z: currentPos.z + (target.z - currentPos.z) * dampingFactor,
  };

  return relocateVertex(mesh, vertex, dampedTarget, constraints);
}

/**
 * Applies tangential smoothing to all relocatable vertices.
 */
export function smoothAllVertices(
  mesh: NonManifoldMesh,
  constraints?: SkeletonConstraints,
  dampingFactor: number = 0.5
): { smoothedCount: number; totalDistance: number } {
  let smoothedCount = 0;
  let totalDistance = 0;

  for (const vertex of mesh.getVertices()) {
    if (vertex.type === VertexType.Manifold || vertex.type === VertexType.OpenBook) {
      const result = smoothVertex(mesh, vertex, constraints, dampingFactor);
      if (result.success) {
        smoothedCount++;
        totalDistance += result.distanceMoved ?? 0;
      }
    }
  }

  return { smoothedCount, totalDistance };
}

/**
 * Vertex relocation operation handler.
 */
export class VertexRelocator {
  private mesh: NonManifoldMesh;
  private constraints: SkeletonConstraints | null = null;

  constructor(mesh: NonManifoldMesh, constraints?: SkeletonConstraints) {
    this.mesh = mesh;
    this.constraints = constraints ?? null;
  }

  /**
   * Sets the skeleton constraints.
   */
  setConstraints(constraints: SkeletonConstraints): void {
    this.constraints = constraints;
  }

  /**
   * Relocates a vertex to a target position.
   */
  relocate(vertex: Vertex, targetPosition: Vec3): VertexRelocationResult {
    return relocateVertex(this.mesh, vertex, targetPosition, this.constraints ?? undefined);
  }

  /**
   * Applies tangential smoothing to a vertex.
   */
  smooth(vertex: Vertex, dampingFactor: number = 0.5): VertexRelocationResult {
    return smoothVertex(this.mesh, vertex, this.constraints ?? undefined, dampingFactor);
  }

  /**
   * Applies tangential smoothing to all relocatable vertices.
   */
  smoothAll(dampingFactor: number = 0.5): { smoothedCount: number; totalDistance: number } {
    return smoothAllVertices(this.mesh, this.constraints ?? undefined, dampingFactor);
  }

  /**
   * Checks if a vertex can be relocated.
   */
  canRelocate(vertex: Vertex): boolean {
    return vertex.type === VertexType.Manifold || vertex.type === VertexType.OpenBook;
  }
}
