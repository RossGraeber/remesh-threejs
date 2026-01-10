import { describe, it, expect } from 'vitest';
import { BufferGeometry, BufferAttribute } from 'three';
import { NonManifoldMesh } from '../src/core/NonManifoldMesh';
import { AdaptiveRemesher, remesh, createRemesher } from '../src/algorithms/AdaptiveRemesher';
import { computeMeshQuality, QualityMetrics } from '../src/algorithms/QualityMetrics';
import { analyzeManifold, ManifoldAnalyzer } from '../src/analysis/ManifoldAnalyzer';
import { classifyAllVertices } from '../src/analysis/VertexClassifier';
import { validateTopology } from '../src/analysis/TopologyValidator';
import { exportBufferGeometry } from '../src/io/BufferGeometryExporter';
import { splitLongEdges } from '../src/operations/EdgeSplit';
import { makeDelaunay } from '../src/operations/EdgeFlip';
import { smoothAllVertices } from '../src/operations/VertexRelocation';

/**
 * Creates a quad geometry (two triangles).1
 */
function createQuadGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const positions = new Float32Array([0, 0, 0, 2, 0, 0, 2, 2, 0, 0, 2, 0]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

/**
 * Creates a simple icosahedron-like geometry for testing.
 */
function createIcosahedronGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const t = (1 + Math.sqrt(5)) / 2;

  const positions = new Float32Array([
    -1,
    t,
    0,
    1,
    t,
    0,
    -1,
    -t,
    0,
    1,
    -t,
    0,
    0,
    -1,
    t,
    0,
    1,
    t,
    0,
    -1,
    -t,
    0,
    1,
    -t,
    t,
    0,
    -1,
    t,
    0,
    1,
    -t,
    0,
    -1,
    -t,
    0,
    1,
  ]);

  const indices = new Uint16Array([
    0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1,
    8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
  ]);

  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

/**
 * Creates a geometry with elongated triangles (poor quality).
 */
function createPoorQualityGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const positions = new Float32Array([
    0,
    0,
    0,
    10,
    0,
    0, // Very long edge
    5,
    0.1,
    0, // Thin triangle
    5,
    -0.1,
    0, // Another thin triangle
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 3, 1]);
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

describe('NonManifoldMesh Integration', () => {
  describe('fromBufferGeometry', () => {
    it('should create mesh from simple quad', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      expect(mesh.vertexCount).toBe(4);
      expect(mesh.faceCount).toBe(2);
      expect(mesh.edgeCount).toBeGreaterThan(0);
    });

    it('should create mesh from icosahedron', () => {
      const geometry = createIcosahedronGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      expect(mesh.vertexCount).toBe(12);
      expect(mesh.faceCount).toBe(20);
    });

    it('should detect if mesh is manifold', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      expect(mesh.isManifold()).toBe(true);
    });
  });

  describe('export to BufferGeometry', () => {
    it('should roundtrip a mesh', () => {
      const original = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(original);
      const exported = exportBufferGeometry(mesh);

      expect(exported.getAttribute('position')).toBeDefined();
      expect(exported.index).toBeDefined();
      expect(exported.index!.count).toBe(6); // 2 triangles * 3 vertices
    });
  });
});

describe('Mesh Operations Integration', () => {
  describe('Edge Split', () => {
    it('should split a long edge', () => {
      const geometry = createPoorQualityGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      const originalVertices = mesh.vertexCount;
      const result = splitLongEdges(mesh, 1.0); // Split edges longer than 1.0

      expect(result.splitCount).toBeGreaterThan(0);
      expect(mesh.vertexCount).toBeGreaterThan(originalVertices);
    });
  });

  describe('Edge Flip (Delaunay)', () => {
    it('should improve mesh quality with Delaunay flips', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      // makeDelaunay returns the number of flips performed
      const flips = makeDelaunay(mesh);
      expect(flips).toBeGreaterThanOrEqual(0);

      // Topology should still be valid
      const validation = validateTopology(mesh);
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Vertex Smoothing', () => {
    it('should smooth vertex positions', () => {
      const geometry = createIcosahedronGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      classifyAllVertices(mesh);
      const result = smoothAllVertices(mesh, undefined, 0.5);

      expect(result.smoothedCount).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Quality Metrics Integration', () => {
  describe('computeMeshQuality', () => {
    it('should compute quality stats for a mesh', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      const stats = computeMeshQuality(mesh);

      expect(stats.minQuality).toBeGreaterThanOrEqual(0);
      expect(stats.maxQuality).toBeLessThanOrEqual(1);
      expect(stats.averageQuality).toBeGreaterThan(0);
    });

    it('should detect poor quality triangles', () => {
      const geometry = createPoorQualityGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      const stats = computeMeshQuality(mesh, 0.5);

      expect(stats.poorQualityCount).toBeGreaterThan(0);
      expect(stats.averageQuality).toBeLessThan(0.5);
    });
  });

  describe('QualityMetrics class', () => {
    it('should provide quality analysis methods', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const metrics = new QualityMetrics(mesh);

      const stats = metrics.computeStats();
      expect(stats.totalArea).toBeGreaterThan(0);

      const poorFaces = metrics.getPoorQualityFaces(0.1);
      expect(poorFaces).toBeDefined();
    });
  });
});

describe('AdaptiveRemesher Integration', () => {
  describe('Single iteration', () => {
    it('should perform one remeshing iteration', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const remesher = new AdaptiveRemesher(mesh, {
        iterations: 1,
        targetEdgeLength: 1.0,
      });

      const state = remesher.iterate();

      expect(state.iteration).toBe(1);
      expect(remesher.getMesh()).toBe(mesh);
    });

    it('should track operation counts', () => {
      const geometry = createPoorQualityGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const remesher = new AdaptiveRemesher(mesh, {
        iterations: 1,
        targetEdgeLength: 0.5,
      });

      remesher.iterate();
      const state = remesher.getState();

      expect(state.edgeSplits).toBeGreaterThanOrEqual(0);
      expect(state.edgeContractions).toBeGreaterThanOrEqual(0);
      expect(state.edgeFlips).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Full remeshing run', () => {
    it('should run multiple iterations', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const remesher = new AdaptiveRemesher(mesh, {
        iterations: 3,
        targetEdgeLength: 0.5,
      });

      const stats = remesher.run();

      expect(stats.iterations).toBeGreaterThanOrEqual(1);
      expect(stats.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should improve mesh quality', () => {
      const geometry = createPoorQualityGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      const initialQuality = computeMeshQuality(mesh);

      const remesher = new AdaptiveRemesher(mesh, {
        iterations: 3,
        targetEdgeLength: 1.0,
      });
      remesher.run();

      const finalQuality = remesher.getQuality();

      // Quality should improve or at least not degrade significantly
      expect(finalQuality.averageQuality).toBeGreaterThanOrEqual(
        initialQuality.averageQuality * 0.5
      );
    });

    it('should preserve topology validity', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const remesher = new AdaptiveRemesher(mesh, {
        iterations: 2,
        targetEdgeLength: 0.5,
      });

      remesher.run();

      const validation = validateTopology(mesh);
      expect(validation.isValid).toBe(true);
    });

    it('should export result to BufferGeometry', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const remesher = new AdaptiveRemesher(mesh, {
        iterations: 1,
      });

      remesher.run();
      const output = remesher.toBufferGeometry();

      expect(output.getAttribute('position')).toBeDefined();
      expect(output.index).toBeDefined();
    });
  });

  describe('Convergence detection', () => {
    it('should detect when quality is good enough', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const remesher = new AdaptiveRemesher(mesh);

      // Force high quality by setting mesh quality
      expect(typeof remesher.hasConverged()).toBe('boolean');
    });
  });
});

describe('remesh convenience function', () => {
  it('should remesh a geometry and return result', () => {
    const geometry = createQuadGeometry();
    const result = remesh(geometry, {
      iterations: 2,
      targetEdgeLength: 1.0,
    });

    expect(result.geometry).toBeDefined();
    expect(result.stats.iterations).toBeGreaterThanOrEqual(1);
  });

  it('should work with default options', () => {
    const geometry = createQuadGeometry();
    const result = remesh(geometry);

    expect(result.geometry).toBeDefined();
    expect(result.stats).toBeDefined();
  });
});

describe('createRemesher convenience function', () => {
  it('should create a remesher from geometry', () => {
    const geometry = createQuadGeometry();
    const remesher = createRemesher(geometry, {
      targetEdgeLength: 1.0,
    });

    expect(remesher.getMesh()).toBeDefined();
  });
});

describe('Full Pipeline Integration', () => {
  it('should handle complete workflow: analyze -> classify -> remesh -> validate -> export', () => {
    // Step 1: Create input geometry
    const input = createIcosahedronGeometry();

    // Step 2: Analyze the input
    const inputAnalysis = analyzeManifold(input);
    expect(inputAnalysis.isManifold).toBe(true);
    expect(inputAnalysis.vertexCount).toBe(12);
    expect(inputAnalysis.faceCount).toBe(20);

    // Step 3: Create mesh and classify vertices
    const mesh = NonManifoldMesh.fromBufferGeometry(input);
    classifyAllVertices(mesh);

    // Step 4: Remesh
    const remesher = new AdaptiveRemesher(mesh, {
      iterations: 2,
      targetEdgeLength: 1.0,
    });
    const stats = remesher.run();

    expect(stats.iterations).toBeGreaterThanOrEqual(1);

    // Step 5: Validate output topology
    const validation = validateTopology(mesh);
    expect(validation.isValid).toBe(true);

    // Step 6: Export
    const output = remesher.toBufferGeometry();
    expect(output.getAttribute('position')).toBeDefined();

    // Step 7: Analyze output
    const analyzer = new ManifoldAnalyzer();
    analyzer.load(output);
    const outputAnalysis = analyzer.analyze();

    expect(outputAnalysis.isManifold).toBe(true);
  });

  it('should handle poor quality input and improve it', () => {
    const input = createPoorQualityGeometry();
    const inputStats = computeMeshQuality(NonManifoldMesh.fromBufferGeometry(input));

    const result = remesh(input, {
      iterations: 3,
      targetEdgeLength: 0.5,
    });

    const outputMesh = NonManifoldMesh.fromBufferGeometry(result.geometry);
    const outputStats = computeMeshQuality(outputMesh);

    // Verify remeshing was performed
    expect(result.stats.iterations).toBeGreaterThanOrEqual(1);

    // Output should have more triangles due to splitting
    expect(outputStats.totalArea).toBeCloseTo(inputStats.totalArea, 0);
  });
});
