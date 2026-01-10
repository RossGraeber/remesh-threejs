import type { Vertex } from '../core/Vertex';
import type { FeatureSkeleton } from '../core/FeatureSkeleton';
import type { SkeletonSegment } from './SkeletonSegment';
import type { Vec3 } from '../geometry/GeometricUtils';
import { VertexType } from '../types/SkeletonData';
import { distance } from '../geometry/GeometricUtils';

/**
 * Result of constraining a vertex movement.
 */
export interface ConstrainedPosition {
  /** The constrained position */
  position: Vec3;

  /** Whether the movement was constrained */
  wasConstrained: boolean;

  /** The segment the vertex is constrained to (if applicable) */
  segment?: SkeletonSegment;

  /** Distance the position was moved during constraint */
  constraintDistance: number;
}

/**
 * Determines movement constraints for vertices based on their type.
 */
export class SkeletonConstraints {
  private skeleton: FeatureSkeleton;

  constructor(skeleton: FeatureSkeleton) {
    this.skeleton = skeleton;
  }

  /**
   * Constrains a target position based on vertex type.
   *
   * - Manifold vertices: Can move freely (no constraint)
   * - Open-book vertices: Constrained to their skeleton segment
   * - Branching vertices: Fixed (cannot move)
   *
   * @param vertex - The vertex to constrain
   * @param targetPosition - The desired target position
   * @returns The constrained position
   */
  constrainPosition(vertex: Vertex, targetPosition: Vec3): ConstrainedPosition {
    switch (vertex.type) {
      case VertexType.Manifold:
        // Manifold vertices can move freely
        return {
          position: targetPosition,
          wasConstrained: false,
          constraintDistance: 0,
        };

      case VertexType.OpenBook:
        // Open-book vertices are constrained to their skeleton segment
        return this.constrainToSegment(vertex, targetPosition);

      case VertexType.SkeletonBranching:
      case VertexType.NonManifoldOther:
        // Branching and other non-manifold vertices are fixed
        return {
          position: {
            x: vertex.position.x,
            y: vertex.position.y,
            z: vertex.position.z,
          },
          wasConstrained: true,
          constraintDistance: distance(targetPosition, {
            x: vertex.position.x,
            y: vertex.position.y,
            z: vertex.position.z,
          }),
        };

      default:
        return {
          position: targetPosition,
          wasConstrained: false,
          constraintDistance: 0,
        };
    }
  }

  /**
   * Constrains a position to a skeleton segment.
   */
  private constrainToSegment(vertex: Vertex, targetPosition: Vec3): ConstrainedPosition {
    const segment = this.skeleton.getSegmentForVertex(vertex);

    if (!segment) {
      // No segment found - project onto nearest segment
      const projection = this.skeleton.projectPoint(targetPosition);
      if (projection) {
        return {
          position: projection.point,
          wasConstrained: true,
          segment: projection.segment,
          constraintDistance: projection.distance,
        };
      }

      // Fallback: don't move
      return {
        position: {
          x: vertex.position.x,
          y: vertex.position.y,
          z: vertex.position.z,
        },
        wasConstrained: true,
        constraintDistance: distance(targetPosition, {
          x: vertex.position.x,
          y: vertex.position.y,
          z: vertex.position.z,
        }),
      };
    }

    // Project onto the segment
    const projection = segment.projectPoint(targetPosition);
    if (!projection) {
      return {
        position: {
          x: vertex.position.x,
          y: vertex.position.y,
          z: vertex.position.z,
        },
        wasConstrained: true,
        segment,
        constraintDistance: 0,
      };
    }

    return {
      position: projection.point,
      wasConstrained: true,
      segment,
      constraintDistance: projection.distance,
    };
  }

  /**
   * Checks if a vertex can move freely.
   */
  canMoveFreely(vertex: Vertex): boolean {
    return vertex.type === VertexType.Manifold;
  }

  /**
   * Checks if a vertex is fixed (cannot move).
   */
  isFixed(vertex: Vertex): boolean {
    return (
      vertex.type === VertexType.SkeletonBranching || vertex.type === VertexType.NonManifoldOther
    );
  }

  /**
   * Checks if a vertex is constrained to a segment.
   */
  isConstrainedToSegment(vertex: Vertex): boolean {
    return vertex.type === VertexType.OpenBook;
  }

  /**
   * Gets the segment a vertex is constrained to.
   */
  getConstraintSegment(vertex: Vertex): SkeletonSegment | undefined {
    if (vertex.type !== VertexType.OpenBook) {
      return undefined;
    }
    return this.skeleton.getSegmentForVertex(vertex);
  }

  /**
   * Computes the allowed movement direction for a vertex.
   * For open-book vertices, this is the tangent direction of the segment.
   */
  getAllowedDirection(vertex: Vertex): Vec3 | null {
    if (vertex.type !== VertexType.OpenBook) {
      return null; // Free movement or fixed
    }

    const segment = this.skeleton.getSegmentForVertex(vertex);
    if (!segment || segment.vertices.length < 2) {
      return null;
    }

    // Find vertex in segment
    const idx = segment.indexOfVertex(vertex);
    if (idx < 0) {
      return null;
    }

    // Compute tangent direction
    let p0: Vec3;
    let p1: Vec3;

    if (idx === 0) {
      const v0 = segment.vertices[0]!;
      const v1 = segment.vertices[1]!;
      p0 = { x: v0.position.x, y: v0.position.y, z: v0.position.z };
      p1 = { x: v1.position.x, y: v1.position.y, z: v1.position.z };
    } else if (idx === segment.vertices.length - 1) {
      const v0 = segment.vertices[idx - 1]!;
      const v1 = segment.vertices[idx]!;
      p0 = { x: v0.position.x, y: v0.position.y, z: v0.position.z };
      p1 = { x: v1.position.x, y: v1.position.y, z: v1.position.z };
    } else {
      // Average of adjacent edges
      const vPrev = segment.vertices[idx - 1]!;
      const vNext = segment.vertices[idx + 1]!;
      p0 = { x: vPrev.position.x, y: vPrev.position.y, z: vPrev.position.z };
      p1 = { x: vNext.position.x, y: vNext.position.y, z: vNext.position.z };
    }

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dz = p1.z - p0.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (len < 1e-10) {
      return null;
    }

    return {
      x: dx / len,
      y: dy / len,
      z: dz / len,
    };
  }
}

/**
 * Creates skeleton constraints for a mesh.
 */
export function createSkeletonConstraints(skeleton: FeatureSkeleton): SkeletonConstraints {
  return new SkeletonConstraints(skeleton);
}
