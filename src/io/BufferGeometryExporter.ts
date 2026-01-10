import { BufferGeometry, BufferAttribute } from 'three';
import type { NonManifoldMesh } from '../core/NonManifoldMesh';

/**
 * Options for exporting a mesh to BufferGeometry.
 */
export interface ExportOptions {
  /**
   * Whether to compute vertex normals.
   * @default true
   */
  computeNormals?: boolean;

  /**
   * Whether to use smooth (averaged) normals.
   * If false, uses flat (per-face) normals.
   * @default true
   */
  smoothNormals?: boolean;

  /**
   * Angle threshold (in radians) for smooth normals.
   * Edges with angles greater than this will have split normals.
   * @default Math.PI / 3 (60 degrees)
   */
  smoothAngle?: number;

  /**
   * Whether to include UV coordinates if available.
   * @default false
   */
  includeUVs?: boolean;
}

/**
 * Exports a NonManifoldMesh to a Three.js BufferGeometry.
 *
 * @param mesh - The mesh to export
 * @param options - Export options
 * @returns The exported BufferGeometry
 */
export function exportBufferGeometry(
  mesh: NonManifoldMesh,
  options: ExportOptions = {}
): BufferGeometry {
  const { computeNormals = true, smoothNormals = true } = options;

  const geometry = new BufferGeometry();

  // Get all faces
  const faces = mesh.getFaces();
  if (faces.length === 0) {
    return geometry;
  }

  // Build vertex index map (vertex ID -> array index)
  const vertices = mesh.getVertices();
  const vertexIndexMap = new Map<number, number>();
  vertices.forEach((v, i) => {
    vertexIndexMap.set(v.id as number, i);
  });

  // Create position array
  const positions = new Float32Array(vertices.length * 3);
  vertices.forEach((v, i) => {
    positions[i * 3] = v.position.x;
    positions[i * 3 + 1] = v.position.y;
    positions[i * 3 + 2] = v.position.z;
  });

  // Create index array
  const indices: number[] = [];
  for (const face of faces) {
    const verts = face.getVertices();
    if (!verts) continue;

    const [v0, v1, v2] = verts;
    const i0 = vertexIndexMap.get(v0.id as number);
    const i1 = vertexIndexMap.get(v1.id as number);
    const i2 = vertexIndexMap.get(v2.id as number);

    if (i0 !== undefined && i1 !== undefined && i2 !== undefined) {
      indices.push(i0, i1, i2);
    }
  }

  // Set attributes
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(indices);

  // Compute normals
  if (computeNormals) {
    if (smoothNormals) {
      computeSmoothNormals(geometry, mesh, vertexIndexMap);
    } else {
      geometry.computeVertexNormals();
    }
  }

  return geometry;
}

/**
 * Computes smooth vertex normals by averaging face normals.
 */
function computeSmoothNormals(
  geometry: BufferGeometry,
  mesh: NonManifoldMesh,
  vertexIndexMap: Map<number, number>
): void {
  const vertices = mesh.getVertices();
  const normals = new Float32Array(vertices.length * 3);
  const normalCounts = new Uint32Array(vertices.length);

  // Accumulate face normals at each vertex
  for (const face of mesh.getFaces()) {
    const faceNormal = face.getNormal();
    if (!faceNormal) continue;

    const verts = face.getVertices();
    if (!verts) continue;

    for (const v of verts) {
      const idx = vertexIndexMap.get(v.id as number);
      if (idx === undefined) continue;

      const baseIdx = idx * 3;
      normals[baseIdx] = (normals[baseIdx] ?? 0) + faceNormal.x;
      normals[baseIdx + 1] = (normals[baseIdx + 1] ?? 0) + faceNormal.y;
      normals[baseIdx + 2] = (normals[baseIdx + 2] ?? 0) + faceNormal.z;
      normalCounts[idx] = (normalCounts[idx] ?? 0) + 1;
    }
  }

  // Normalize
  for (let i = 0; i < vertices.length; i++) {
    const count = normalCounts[i] ?? 0;
    if (count === 0) continue;

    const baseIdx = i * 3;
    const nx = (normals[baseIdx] ?? 0) / count;
    const ny = (normals[baseIdx + 1] ?? 0) / count;
    const nz = (normals[baseIdx + 2] ?? 0) / count;

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 1e-10) {
      normals[i * 3] = nx / len;
      normals[i * 3 + 1] = ny / len;
      normals[i * 3 + 2] = nz / len;
    } else {
      normals[i * 3] = 0;
      normals[i * 3 + 1] = 1;
      normals[i * 3 + 2] = 0;
    }
  }

  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
}

/**
 * Exports only skeleton edges as a LineSegments geometry.
 *
 * @param mesh - The mesh to export skeleton from
 * @returns BufferGeometry suitable for THREE.LineSegments
 */
export function exportSkeletonGeometry(mesh: NonManifoldMesh): BufferGeometry {
  const geometry = new BufferGeometry();
  const skeletonEdges = mesh.getSkeletonEdges();

  if (skeletonEdges.length === 0) {
    return geometry;
  }

  // Each edge needs 2 vertices (6 floats)
  const positions = new Float32Array(skeletonEdges.length * 6);

  let offset = 0;
  for (const edge of skeletonEdges) {
    const [v0, v1] = edge.getVertices();
    if (!v0 || !v1) continue;

    positions[offset++] = v0.position.x;
    positions[offset++] = v0.position.y;
    positions[offset++] = v0.position.z;

    positions[offset++] = v1.position.x;
    positions[offset++] = v1.position.y;
    positions[offset++] = v1.position.z;
  }

  geometry.setAttribute('position', new BufferAttribute(positions.slice(0, offset), 3));

  return geometry;
}

/**
 * Creates a colored mesh geometry for visualizing vertex classification.
 *
 * @param mesh - The mesh to visualize
 * @returns BufferGeometry with vertex colors based on classification
 */
export function exportClassificationGeometry(mesh: NonManifoldMesh): BufferGeometry {
  const baseGeometry = exportBufferGeometry(mesh, { computeNormals: true });

  const vertices = mesh.getVertices();
  const colors = new Float32Array(vertices.length * 3);

  // Build vertex index map
  const vertexIndexMap = new Map<number, number>();
  vertices.forEach((v, i) => {
    vertexIndexMap.set(v.id as number, i);
  });

  // Color by vertex type
  // Manifold: green, OpenBook: blue, SkeletonBranching: red, NonManifoldOther: magenta
  for (const vertex of vertices) {
    const idx = vertexIndexMap.get(vertex.id as number);
    if (idx === undefined) continue;

    let r = 0,
      g = 0,
      b = 0;

    switch (vertex.type) {
      case 'manifold':
        r = 0.2;
        g = 0.8;
        b = 0.2;
        break;
      case 'open_book':
        r = 0.2;
        g = 0.4;
        b = 0.9;
        break;
      case 'skeleton_branching':
        r = 0.9;
        g = 0.2;
        b = 0.2;
        break;
      case 'non_manifold_other':
        r = 0.9;
        g = 0.2;
        b = 0.9;
        break;
    }

    colors[idx * 3] = r;
    colors[idx * 3 + 1] = g;
    colors[idx * 3 + 2] = b;
  }

  baseGeometry.setAttribute('color', new BufferAttribute(colors, 3));

  return baseGeometry;
}

/**
 * Creates a mesh geometry with face colors based on triangle quality.
 *
 * @param mesh - The mesh to visualize
 * @returns BufferGeometry with vertex colors representing quality
 */
export function exportQualityGeometry(mesh: NonManifoldMesh): BufferGeometry {
  const faces = mesh.getFaces();
  if (faces.length === 0) {
    return new BufferGeometry();
  }

  // For quality visualization, we need per-face colors, so we use non-indexed geometry
  const positions = new Float32Array(faces.length * 9); // 3 vertices * 3 coords
  const colors = new Float32Array(faces.length * 9); // 3 vertices * 3 color components
  const normals = new Float32Array(faces.length * 9);

  let offset = 0;
  for (const face of faces) {
    const verts = face.getVertices();
    const normal = face.getNormal();
    const quality = face.getQuality() ?? 0;

    if (!verts || !normal) continue;

    // Color mapping: red (bad quality) -> yellow -> green (good quality)
    const r = quality < 0.5 ? 1.0 : 2.0 - quality * 2.0;
    const g = quality < 0.5 ? quality * 2.0 : 1.0;
    const b = 0.1;

    for (const v of verts) {
      // Position
      positions[offset] = v.position.x;
      positions[offset + 1] = v.position.y;
      positions[offset + 2] = v.position.z;

      // Color
      colors[offset] = r;
      colors[offset + 1] = g;
      colors[offset + 2] = b;

      // Normal
      normals[offset] = normal.x;
      normals[offset + 1] = normal.y;
      normals[offset + 2] = normal.z;

      offset += 3;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions.slice(0, offset), 3));
  geometry.setAttribute('color', new BufferAttribute(colors.slice(0, offset), 3));
  geometry.setAttribute('normal', new BufferAttribute(normals.slice(0, offset), 3));

  return geometry;
}

/**
 * Utility class for exporting meshes with various options.
 */
export class BufferGeometryExporter {
  private options: ExportOptions;

  constructor(options: ExportOptions = {}) {
    this.options = options;
  }

  /**
   * Exports a NonManifoldMesh to BufferGeometry.
   */
  export(mesh: NonManifoldMesh): BufferGeometry {
    return exportBufferGeometry(mesh, this.options);
  }

  /**
   * Exports skeleton edges as LineSegments geometry.
   */
  exportSkeleton(mesh: NonManifoldMesh): BufferGeometry {
    return exportSkeletonGeometry(mesh);
  }

  /**
   * Exports with vertex classification colors.
   */
  exportClassification(mesh: NonManifoldMesh): BufferGeometry {
    return exportClassificationGeometry(mesh);
  }

  /**
   * Exports with quality visualization colors.
   */
  exportQuality(mesh: NonManifoldMesh): BufferGeometry {
    return exportQualityGeometry(mesh);
  }

  /**
   * Sets whether to compute normals.
   */
  setComputeNormals(enabled: boolean): this {
    this.options.computeNormals = enabled;
    return this;
  }

  /**
   * Sets whether to use smooth normals.
   */
  setSmoothNormals(enabled: boolean): this {
    this.options.smoothNormals = enabled;
    return this;
  }
}
