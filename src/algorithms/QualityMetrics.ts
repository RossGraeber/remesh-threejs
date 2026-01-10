import type { NonManifoldMesh } from '../core/NonManifoldMesh';
import type { Face } from '../core/Face';
import type { Edge } from '../core/Edge';
import type { Vertex } from '../core/Vertex';

/**
 * Quality statistics for a mesh.
 */
export interface MeshQualityStats {
  /** Minimum triangle quality (0 to 1) */
  minQuality: number;

  /** Maximum triangle quality (0 to 1) */
  maxQuality: number;

  /** Average triangle quality (0 to 1) */
  averageQuality: number;

  /** Standard deviation of triangle quality */
  stdDevQuality: number;

  /** Number of triangles with quality below threshold */
  poorQualityCount: number;

  /** Minimum edge length */
  minEdgeLength: number;

  /** Maximum edge length */
  maxEdgeLength: number;

  /** Average edge length */
  averageEdgeLength: number;

  /** Minimum triangle area */
  minArea: number;

  /** Maximum triangle area */
  maxArea: number;

  /** Total surface area */
  totalArea: number;
}

/**
 * Computes quality statistics for a mesh.
 */
export function computeMeshQuality(
  mesh: NonManifoldMesh,
  poorQualityThreshold: number = 0.3
): MeshQualityStats {
  const faces = mesh.getFaces();
  const edges = mesh.getEdges();

  // Triangle quality
  const qualities: number[] = [];
  const areas: number[] = [];

  for (const face of faces) {
    const quality = face.getQuality();
    if (quality !== null) {
      qualities.push(quality);
    }

    const area = face.getArea();
    if (area !== null) {
      areas.push(area);
    }
  }

  // Edge lengths
  const edgeLengths = edges.map((e) => e.length);

  // Compute stats
  const minQuality = qualities.length > 0 ? Math.min(...qualities) : 0;
  const maxQuality = qualities.length > 0 ? Math.max(...qualities) : 0;
  const averageQuality =
    qualities.length > 0 ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0;

  const variance =
    qualities.length > 0
      ? qualities.reduce((sum, q) => sum + Math.pow(q - averageQuality, 2), 0) / qualities.length
      : 0;
  const stdDevQuality = Math.sqrt(variance);

  const poorQualityCount = qualities.filter((q) => q < poorQualityThreshold).length;

  const minEdgeLength = edgeLengths.length > 0 ? Math.min(...edgeLengths) : 0;
  const maxEdgeLength = edgeLengths.length > 0 ? Math.max(...edgeLengths) : 0;
  const averageEdgeLength =
    edgeLengths.length > 0 ? edgeLengths.reduce((a, b) => a + b, 0) / edgeLengths.length : 0;

  const minArea = areas.length > 0 ? Math.min(...areas) : 0;
  const maxArea = areas.length > 0 ? Math.max(...areas) : 0;
  const totalArea = areas.reduce((a, b) => a + b, 0);

  return {
    minQuality,
    maxQuality,
    averageQuality,
    stdDevQuality,
    poorQualityCount,
    minEdgeLength,
    maxEdgeLength,
    averageEdgeLength,
    minArea,
    maxArea,
    totalArea,
  };
}

/**
 * Gets faces with quality below a threshold.
 */
export function getPoorQualityFaces(mesh: NonManifoldMesh, threshold: number = 0.3): Face[] {
  return mesh.getFaces().filter((face) => {
    const quality = face.getQuality();
    return quality !== null && quality < threshold;
  });
}

/**
 * Gets edges that are too long (should be split).
 */
export function getLongEdges(
  mesh: NonManifoldMesh,
  targetLength: number,
  maxRatio: number = 1.333
): Edge[] {
  const maxLength = targetLength * maxRatio;
  return mesh.getEdges().filter((e) => e.length > maxLength);
}

/**
 * Gets edges that are too short (should be collapsed).
 */
export function getShortEdges(
  mesh: NonManifoldMesh,
  targetLength: number,
  minRatio: number = 0.4
): Edge[] {
  const minLength = targetLength * minRatio;
  return mesh.getEdges().filter((e) => e.length < minLength);
}

/**
 * Computes the target edge length based on mesh bounding box.
 */
export function computeTargetEdgeLength(mesh: NonManifoldMesh, numTargetVertices?: number): number {
  const vertices = mesh.getVertices();
  if (vertices.length === 0) {
    return 1.0;
  }

  // Compute bounding box
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (const v of vertices) {
    minX = Math.min(minX, v.position.x);
    minY = Math.min(minY, v.position.y);
    minZ = Math.min(minZ, v.position.z);
    maxX = Math.max(maxX, v.position.x);
    maxY = Math.max(maxY, v.position.y);
    maxZ = Math.max(maxZ, v.position.z);
  }

  const diagonal = Math.sqrt(
    Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2) + Math.pow(maxZ - minZ, 2)
  );

  if (numTargetVertices !== undefined && numTargetVertices > 0) {
    // Estimate edge length from target vertex count
    // For a closed manifold surface: F ≈ 2V, E ≈ 3V
    // Average edge length ≈ sqrt(surface area / (2 * V))
    const stats = computeMeshQuality(mesh);
    if (stats.totalArea > 0) {
      return Math.sqrt(stats.totalArea / (2 * numTargetVertices));
    }
  }

  // Default: diagonal / sqrt(vertex count)
  return diagonal / Math.sqrt(vertices.length);
}

/**
 * Computes the aspect ratio of a triangle (longest / shortest edge).
 */
export function computeTriangleAspectRatio(face: Face): number | null {
  const halfedges = face.getHalfedges();
  if (!halfedges) {
    return null;
  }

  const lengths = halfedges.map((he) => he.edge.length);
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);

  if (minLen < 1e-10) {
    return Infinity;
  }

  return maxLen / minLen;
}

/**
 * Gets vertices with high valence (many incident edges).
 */
export function getHighValenceVertices(mesh: NonManifoldMesh, maxValence: number = 8): Vertex[] {
  return mesh.getVertices().filter((v) => {
    const degree = v.degree();
    return degree !== null && degree > maxValence;
  });
}

/**
 * Gets vertices with low valence (few incident edges).
 */
export function getLowValenceVertices(mesh: NonManifoldMesh, minValence: number = 4): Vertex[] {
  return mesh.getVertices().filter((v) => {
    const degree = v.degree();
    return degree !== null && degree < minValence;
  });
}

/**
 * Quality metrics utility class.
 */
export class QualityMetrics {
  private mesh: NonManifoldMesh;

  constructor(mesh: NonManifoldMesh) {
    this.mesh = mesh;
  }

  /**
   * Computes overall mesh quality statistics.
   */
  computeStats(poorQualityThreshold: number = 0.3): MeshQualityStats {
    return computeMeshQuality(this.mesh, poorQualityThreshold);
  }

  /**
   * Gets poor quality faces.
   */
  getPoorQualityFaces(threshold: number = 0.3): Face[] {
    return getPoorQualityFaces(this.mesh, threshold);
  }

  /**
   * Gets long edges that should be split.
   */
  getLongEdges(targetLength: number, maxRatio: number = 1.333): Edge[] {
    return getLongEdges(this.mesh, targetLength, maxRatio);
  }

  /**
   * Gets short edges that should be collapsed.
   */
  getShortEdges(targetLength: number, minRatio: number = 0.4): Edge[] {
    return getShortEdges(this.mesh, targetLength, minRatio);
  }

  /**
   * Computes target edge length.
   */
  computeTargetEdgeLength(numTargetVertices?: number): number {
    return computeTargetEdgeLength(this.mesh, numTargetVertices);
  }

  /**
   * Gets high valence vertices.
   */
  getHighValenceVertices(maxValence: number = 8): Vertex[] {
    return getHighValenceVertices(this.mesh, maxValence);
  }

  /**
   * Gets low valence vertices.
   */
  getLowValenceVertices(minValence: number = 4): Vertex[] {
    return getLowValenceVertices(this.mesh, minValence);
  }
}
