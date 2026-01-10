import type { BufferGeometry } from 'three';
import { NonManifoldMesh } from '../core/NonManifoldMesh';
import { EdgeType, VertexType } from '../types/SkeletonData';
import type { Edge } from '../core/Edge';
import type { Vertex } from '../core/Vertex';

/**
 * Information about a non-manifold edge.
 */
export interface NonManifoldEdgeInfo {
  /** Index of the edge */
  edgeId: number;

  /** Indices of the two vertices */
  vertexIndices: [number, number];

  /** Number of incident faces */
  faceCount: number;

  /** Positions of the edge endpoints */
  positions: [{ x: number; y: number; z: number }, { x: number; y: number; z: number }];
}

/**
 * Information about a non-manifold vertex.
 */
export interface NonManifoldVertexInfo {
  /** Index of the vertex */
  vertexId: number;

  /** Position of the vertex */
  position: { x: number; y: number; z: number };

  /** Classification type */
  type: VertexType;

  /** Number of incident skeleton edges */
  skeletonEdgeCount: number;
}

/**
 * Result of manifold analysis.
 */
export interface ManifoldAnalysisResult {
  /** Whether the mesh is manifold */
  isManifold: boolean;

  /** Whether the mesh has boundary edges */
  hasBoundary: boolean;

  /** Total number of vertices */
  vertexCount: number;

  /** Total number of edges */
  edgeCount: number;

  /** Total number of faces */
  faceCount: number;

  /** Number of manifold edges */
  manifoldEdgeCount: number;

  /** Number of non-manifold edges */
  nonManifoldEdgeCount: number;

  /** Number of boundary edges */
  boundaryEdgeCount: number;

  /** Number of manifold vertices */
  manifoldVertexCount: number;

  /** Number of non-manifold vertices */
  nonManifoldVertexCount: number;

  /** Detailed info about non-manifold edges */
  nonManifoldEdges: NonManifoldEdgeInfo[];

  /** Detailed info about non-manifold vertices */
  nonManifoldVertices: NonManifoldVertexInfo[];

  /** Euler characteristic (V - E + F) */
  eulerCharacteristic: number;

  /** Average vertex degree */
  averageVertexDegree: number;
}

/**
 * Analyzes a BufferGeometry for manifoldness.
 *
 * @param geometry - The geometry to analyze
 * @returns Analysis result
 */
export function analyzeManifold(geometry: BufferGeometry): ManifoldAnalysisResult {
  const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
  return analyzeMesh(mesh);
}

/**
 * Analyzes a NonManifoldMesh for manifoldness.
 *
 * @param mesh - The mesh to analyze
 * @returns Analysis result
 */
export function analyzeMesh(mesh: NonManifoldMesh): ManifoldAnalysisResult {
  const edges = mesh.getEdges();
  const vertices = mesh.getVertices();

  // Count edge types
  let manifoldEdgeCount = 0;
  let nonManifoldEdgeCount = 0;
  let boundaryEdgeCount = 0;

  const nonManifoldEdges: NonManifoldEdgeInfo[] = [];

  for (const edge of edges) {
    switch (edge.type) {
      case EdgeType.Manifold:
      case EdgeType.Feature:
        manifoldEdgeCount++;
        break;
      case EdgeType.NonManifold:
        nonManifoldEdgeCount++;
        nonManifoldEdges.push(extractEdgeInfo(edge));
        break;
      case EdgeType.Boundary:
        boundaryEdgeCount++;
        break;
    }
  }

  // Count vertex types
  let manifoldVertexCount = 0;
  let nonManifoldVertexCount = 0;
  let totalDegree = 0;

  const nonManifoldVertices: NonManifoldVertexInfo[] = [];

  for (const vertex of vertices) {
    const degree = vertex.degree() ?? 0;
    totalDegree += degree;

    if (vertex.type === VertexType.Manifold) {
      manifoldVertexCount++;
    } else {
      nonManifoldVertexCount++;
      nonManifoldVertices.push(extractVertexInfo(vertex));
    }
  }

  const averageVertexDegree = vertices.length > 0 ? totalDegree / vertices.length : 0;
  const eulerCharacteristic = mesh.vertexCount - mesh.edgeCount + mesh.faceCount;

  return {
    isManifold: nonManifoldEdgeCount === 0,
    hasBoundary: boundaryEdgeCount > 0,
    vertexCount: mesh.vertexCount,
    edgeCount: mesh.edgeCount,
    faceCount: mesh.faceCount,
    manifoldEdgeCount,
    nonManifoldEdgeCount,
    boundaryEdgeCount,
    manifoldVertexCount,
    nonManifoldVertexCount,
    nonManifoldEdges,
    nonManifoldVertices,
    eulerCharacteristic,
    averageVertexDegree,
  };
}

/**
 * Extracts info about a non-manifold edge.
 */
function extractEdgeInfo(edge: Edge): NonManifoldEdgeInfo {
  const [v0, v1] = edge.getVertices();

  return {
    edgeId: edge.id as number,
    vertexIndices: [v0 ? (v0.id as number) : -1, v1 ? (v1.id as number) : -1],
    faceCount: edge.getFaceCount(),
    positions: [
      v0 ? { x: v0.position.x, y: v0.position.y, z: v0.position.z } : { x: 0, y: 0, z: 0 },
      v1 ? { x: v1.position.x, y: v1.position.y, z: v1.position.z } : { x: 0, y: 0, z: 0 },
    ],
  };
}

/**
 * Extracts info about a non-manifold vertex.
 */
function extractVertexInfo(vertex: Vertex): NonManifoldVertexInfo {
  let skeletonEdgeCount = 0;

  vertex.forEachOutgoingHalfedge((he) => {
    if (he.edge.isSkeletonEdge()) {
      skeletonEdgeCount++;
    }
  });

  return {
    vertexId: vertex.id as number,
    position: { x: vertex.position.x, y: vertex.position.y, z: vertex.position.z },
    type: vertex.type,
    skeletonEdgeCount,
  };
}

/**
 * Quick check if a geometry is manifold.
 *
 * @param geometry - The geometry to check
 * @returns True if the geometry is manifold
 */
export function isManifold(geometry: BufferGeometry): boolean {
  const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
  return mesh.isManifold();
}

/**
 * Class for analyzing mesh manifoldness with caching.
 */
export class ManifoldAnalyzer {
  private mesh: NonManifoldMesh | null = null;
  private cachedResult: ManifoldAnalysisResult | null = null;

  /**
   * Loads a geometry for analysis.
   */
  load(geometry: BufferGeometry): this {
    this.mesh = NonManifoldMesh.fromBufferGeometry(geometry);
    this.cachedResult = null;
    return this;
  }

  /**
   * Loads an existing mesh for analysis.
   */
  loadMesh(mesh: NonManifoldMesh): this {
    this.mesh = mesh;
    this.cachedResult = null;
    return this;
  }

  /**
   * Gets the analysis result (cached).
   */
  analyze(): ManifoldAnalysisResult {
    if (!this.mesh) {
      throw new Error('No mesh loaded. Call load() first.');
    }

    if (!this.cachedResult) {
      this.cachedResult = analyzeMesh(this.mesh);
    }

    return this.cachedResult;
  }

  /**
   * Checks if the mesh is manifold.
   */
  isManifold(): boolean {
    return this.analyze().isManifold;
  }

  /**
   * Checks if the mesh has boundary.
   */
  hasBoundary(): boolean {
    return this.analyze().hasBoundary;
  }

  /**
   * Gets non-manifold edges.
   */
  getNonManifoldEdges(): NonManifoldEdgeInfo[] {
    return this.analyze().nonManifoldEdges;
  }

  /**
   * Gets non-manifold vertices.
   */
  getNonManifoldVertices(): NonManifoldVertexInfo[] {
    return this.analyze().nonManifoldVertices;
  }

  /**
   * Gets the underlying mesh.
   */
  getMesh(): NonManifoldMesh | null {
    return this.mesh;
  }

  /**
   * Clears cached results.
   */
  clearCache(): this {
    this.cachedResult = null;
    return this;
  }
}
