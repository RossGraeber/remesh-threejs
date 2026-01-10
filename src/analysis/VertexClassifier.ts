import type { NonManifoldMesh } from '../core/NonManifoldMesh';
import type { Vertex } from '../core/Vertex';
import { VertexType } from '../types/SkeletonData';

/**
 * Statistics about vertex classification.
 */
export interface ClassificationStats {
  /** Number of manifold vertices */
  manifold: number;

  /** Number of open-book vertices */
  openBook: number;

  /** Number of skeleton branching vertices */
  skeletonBranching: number;

  /** Number of other non-manifold vertices */
  nonManifoldOther: number;

  /** Total vertex count */
  total: number;
}

/**
 * Classifies all vertices in a mesh based on their neighborhood topology.
 *
 * @param mesh - The mesh to classify
 * @returns Classification statistics
 */
export function classifyAllVertices(mesh: NonManifoldMesh): ClassificationStats {
  const stats: ClassificationStats = {
    manifold: 0,
    openBook: 0,
    skeletonBranching: 0,
    nonManifoldOther: 0,
    total: 0,
  };

  for (const vertex of mesh.getVertices()) {
    vertex.type = classifyVertex(vertex);
    stats.total++;

    switch (vertex.type) {
      case VertexType.Manifold:
        stats.manifold++;
        break;
      case VertexType.OpenBook:
        stats.openBook++;
        break;
      case VertexType.SkeletonBranching:
        stats.skeletonBranching++;
        break;
      case VertexType.NonManifoldOther:
        stats.nonManifoldOther++;
        break;
    }
  }

  return stats;
}

/**
 * Classifies a single vertex based on its neighborhood.
 *
 * Vertex classification:
 * - Manifold: Star homeomorphic to disk, can move freely in 3D
 * - OpenBook: On exactly 2 skeleton edges (like pages of a book)
 * - SkeletonBranching: On 1 or >2 skeleton edges, position is fixed
 * - NonManifoldOther: Other non-manifold configurations
 *
 * @param vertex - The vertex to classify
 * @returns The vertex type
 */
export function classifyVertex(vertex: Vertex): VertexType {
  // Count skeleton edges incident to this vertex
  let skeletonEdgeCount = 0;
  let totalEdgeCount = 0;
  let hasBoundary = false;
  let hasNonManifold = false;

  vertex.forEachOutgoingHalfedge((he) => {
    totalEdgeCount++;

    if (he.edge.isSkeletonEdge()) {
      skeletonEdgeCount++;
    }

    if (he.edge.isBoundary()) {
      hasBoundary = true;
    }

    if (he.edge.isNonManifold()) {
      hasNonManifold = true;
    }
  });

  // If no edges, treat as manifold (isolated vertex)
  if (totalEdgeCount === 0) {
    return VertexType.Manifold;
  }

  // Check for non-manifold configurations
  if (hasNonManifold) {
    if (skeletonEdgeCount === 2) {
      return VertexType.OpenBook;
    } else if (skeletonEdgeCount === 1 || skeletonEdgeCount > 2) {
      return VertexType.SkeletonBranching;
    }
    return VertexType.NonManifoldOther;
  }

  // Check for boundary configurations
  if (hasBoundary) {
    if (skeletonEdgeCount === 2) {
      return VertexType.OpenBook;
    } else if (skeletonEdgeCount === 1 || skeletonEdgeCount > 2) {
      return VertexType.SkeletonBranching;
    }
  }

  // No skeleton edges - manifold vertex
  if (skeletonEdgeCount === 0) {
    return VertexType.Manifold;
  }

  // Exactly 2 skeleton edges - open-book
  if (skeletonEdgeCount === 2) {
    return VertexType.OpenBook;
  }

  // 1 or >2 skeleton edges - branching
  return VertexType.SkeletonBranching;
}

/**
 * Gets all vertices of a specific type.
 *
 * @param mesh - The mesh to search
 * @param type - The vertex type to find
 * @returns Array of vertices matching the type
 */
export function getVerticesByType(mesh: NonManifoldMesh, type: VertexType): Vertex[] {
  return mesh.getVertices().filter((v) => v.type === type);
}

/**
 * Gets all manifold vertices.
 */
export function getManifoldVertices(mesh: NonManifoldMesh): Vertex[] {
  return getVerticesByType(mesh, VertexType.Manifold);
}

/**
 * Gets all open-book vertices.
 */
export function getOpenBookVertices(mesh: NonManifoldMesh): Vertex[] {
  return getVerticesByType(mesh, VertexType.OpenBook);
}

/**
 * Gets all skeleton branching vertices.
 */
export function getSkeletonBranchingVertices(mesh: NonManifoldMesh): Vertex[] {
  return getVerticesByType(mesh, VertexType.SkeletonBranching);
}

/**
 * Gets all non-manifold vertices (open-book + branching + other).
 */
export function getNonManifoldVertices(mesh: NonManifoldMesh): Vertex[] {
  return mesh.getVertices().filter((v) => v.type !== VertexType.Manifold);
}

/**
 * Reclassifies all vertices in a mesh.
 * Call this after topology changes.
 */
export function reclassifyVertices(mesh: NonManifoldMesh): void {
  mesh.classifyVertices();
}

/**
 * Class for vertex classification operations.
 */
export class VertexClassifier {
  private mesh: NonManifoldMesh;

  constructor(mesh: NonManifoldMesh) {
    this.mesh = mesh;
  }

  /**
   * Classifies all vertices and returns statistics.
   */
  classifyAll(): ClassificationStats {
    return classifyAllVertices(this.mesh);
  }

  /**
   * Gets vertices of a specific type.
   */
  getByType(type: VertexType): Vertex[] {
    return getVerticesByType(this.mesh, type);
  }

  /**
   * Gets all manifold vertices.
   */
  getManifold(): Vertex[] {
    return getManifoldVertices(this.mesh);
  }

  /**
   * Gets all non-manifold vertices.
   */
  getNonManifold(): Vertex[] {
    return getNonManifoldVertices(this.mesh);
  }

  /**
   * Reclassifies all vertices.
   */
  reclassify(): void {
    reclassifyVertices(this.mesh);
  }
}
