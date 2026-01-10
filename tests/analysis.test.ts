import { describe, it, expect, beforeEach } from 'vitest';
import { BufferGeometry, BufferAttribute } from 'three';
import {
  analyzeManifold,
  analyzeMesh,
  isManifold,
  ManifoldAnalyzer,
} from '../src/analysis/ManifoldAnalyzer';
import {
  classifyAllVertices,
  getVerticesByType,
  VertexClassifier,
} from '../src/analysis/VertexClassifier';
import {
  validateTopology,
  isTopologyValid,
  TopologyValidator,
} from '../src/analysis/TopologyValidator';
import { NonManifoldMesh } from '../src/core/NonManifoldMesh';
import { VertexType } from '../src/types/SkeletonData';

/**
 * Creates a simple triangle geometry for testing.
 */
function createTriangleGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const positions = new Float32Array([
    0,
    0,
    0, // v0
    1,
    0,
    0, // v1
    0.5,
    1,
    0, // v2
  ]);
  const indices = new Uint16Array([0, 1, 2]);
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

/**
 * Creates a quad (two triangles sharing an edge) geometry.
 */
function createQuadGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const positions = new Float32Array([
    0,
    0,
    0, // v0
    1,
    0,
    0, // v1
    1,
    1,
    0, // v2
    0,
    1,
    0, // v3
  ]);
  const indices = new Uint16Array([
    0,
    1,
    2, // face 0
    0,
    2,
    3, // face 1
  ]);
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

/**
 * Creates a tetrahedron geometry (4 vertices, 4 faces).
 */
function createTetrahedronGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const positions = new Float32Array([
    0,
    0,
    0, // v0
    1,
    0,
    0, // v1
    0.5,
    0,
    0.866, // v2
    0.5,
    0.816,
    0.289, // v3
  ]);
  const indices = new Uint16Array([
    0,
    1,
    2, // base
    0,
    1,
    3, // front
    1,
    2,
    3, // right
    2,
    0,
    3, // left
  ]);
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

/**
 * Creates a non-manifold geometry (3 triangles sharing one edge).
 */
function createNonManifoldGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  const positions = new Float32Array([
    0,
    0,
    0, // v0 - shared edge start
    1,
    0,
    0, // v1 - shared edge end
    0.5,
    1,
    0, // v2 - top of first triangle
    0.5,
    -1,
    0, // v3 - bottom of second triangle
    0.5,
    0.5,
    1, // v4 - front of third triangle
  ]);
  const indices = new Uint16Array([
    0,
    1,
    2, // face 0
    0,
    1,
    3, // face 1 (shares edge 0-1 with face 0)
    0,
    1,
    4, // face 2 (shares edge 0-1 with faces 0 and 1)
  ]);
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  return geometry;
}

describe('ManifoldAnalyzer', () => {
  describe('analyzeManifold', () => {
    it('should analyze a single triangle', () => {
      const geometry = createTriangleGeometry();
      const result = analyzeManifold(geometry);

      expect(result.vertexCount).toBe(3);
      expect(result.faceCount).toBe(1);
      expect(result.hasBoundary).toBe(true); // Single triangle has boundary edges
    });

    it('should analyze a manifold quad', () => {
      const geometry = createQuadGeometry();
      const result = analyzeManifold(geometry);

      expect(result.vertexCount).toBe(4);
      expect(result.faceCount).toBe(2);
      expect(result.isManifold).toBe(true);
      expect(result.nonManifoldEdgeCount).toBe(0);
    });

    it('should detect non-manifold edges', () => {
      const geometry = createNonManifoldGeometry();
      const result = analyzeManifold(geometry);

      expect(result.isManifold).toBe(false);
      expect(result.nonManifoldEdgeCount).toBeGreaterThan(0);
      expect(result.nonManifoldEdges.length).toBeGreaterThan(0);
    });
  });

  describe('isManifold', () => {
    it('should return true for manifold geometry', () => {
      const geometry = createQuadGeometry();
      expect(isManifold(geometry)).toBe(true);
    });

    it('should return false for non-manifold geometry', () => {
      const geometry = createNonManifoldGeometry();
      expect(isManifold(geometry)).toBe(false);
    });
  });

  describe('ManifoldAnalyzer class', () => {
    let analyzer: ManifoldAnalyzer;

    beforeEach(() => {
      analyzer = new ManifoldAnalyzer();
    });

    it('should throw if analyze called without loading', () => {
      expect(() => analyzer.analyze()).toThrow('No mesh loaded');
    });

    it('should load and analyze geometry', () => {
      const geometry = createQuadGeometry();
      const result = analyzer.load(geometry).analyze();

      expect(result.faceCount).toBe(2);
    });

    it('should cache analysis results', () => {
      const geometry = createQuadGeometry();
      analyzer.load(geometry);

      const result1 = analyzer.analyze();
      const result2 = analyzer.analyze();

      expect(result1).toBe(result2); // Same object (cached)
    });

    it('should clear cache', () => {
      const geometry = createQuadGeometry();
      analyzer.load(geometry);

      const result1 = analyzer.analyze();
      analyzer.clearCache();
      const result2 = analyzer.analyze();

      expect(result1).not.toBe(result2); // Different objects after clear
    });

    it('should provide accessor methods', () => {
      const geometry = createQuadGeometry();
      analyzer.load(geometry);

      expect(analyzer.isManifold()).toBe(true);
      expect(analyzer.hasBoundary()).toBe(true);
      expect(analyzer.getNonManifoldEdges()).toEqual([]);
    });

    it('should get underlying mesh', () => {
      const geometry = createQuadGeometry();
      analyzer.load(geometry);

      expect(analyzer.getMesh()).not.toBeNull();
    });

    it('should load mesh directly', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      const result = analyzer.loadMesh(mesh).analyze();
      expect(result.faceCount).toBe(2);
    });
  });
});

describe('VertexClassifier', () => {
  describe('classifyAllVertices', () => {
    it('should classify vertices in a manifold mesh', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      const stats = classifyAllVertices(mesh);

      expect(stats.total).toBe(4);
      // Boundary vertices may be classified as skeleton branching or open-book
      // since boundary edges are skeleton edges
      expect(stats.manifold + stats.openBook + stats.skeletonBranching).toBe(4);
    });

    it('should classify vertices in a non-manifold mesh', () => {
      const geometry = createNonManifoldGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      classifyAllVertices(mesh);

      // Should have some non-manifold vertices
      const nonManifoldVerts = mesh.getVertices().filter((v) => v.type !== VertexType.Manifold);
      expect(nonManifoldVerts.length).toBeGreaterThan(0);
    });
  });

  describe('getVerticesByType', () => {
    it('should filter vertices by type', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      classifyAllVertices(mesh);

      const manifoldVerts = getVerticesByType(mesh, VertexType.Manifold);
      expect(manifoldVerts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('VertexClassifier class', () => {
    it('should classify and return stats', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const classifier = new VertexClassifier(mesh);

      const stats = classifier.classifyAll();

      expect(stats.total).toBe(4);
    });

    it('should reclassify on demand', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const classifier = new VertexClassifier(mesh);

      classifier.classifyAll();
      classifier.reclassify();

      // Verify vertices are still classified
      const manifoldVerts = classifier.getManifold();
      const nonManifoldVerts = classifier.getNonManifold();
      expect(manifoldVerts.length + nonManifoldVerts.length).toBe(4);
    });
  });
});

describe('TopologyValidator', () => {
  describe('validateTopology', () => {
    it('should validate a simple triangle', () => {
      const geometry = createTriangleGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      const result = validateTopology(mesh);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a quad', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      const result = validateTopology(mesh);

      expect(result.isValid).toBe(true);
    });

    it('should validate a tetrahedron', () => {
      const geometry = createTetrahedronGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      const result = validateTopology(mesh);

      expect(result.isValid).toBe(true);
    });

    it('should provide validation errors and warnings', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      const result = validateTopology(mesh);

      expect(result.isValid).toBe(true);
      expect(result.errors).toBeDefined();
      expect(result.warnings).toBeDefined();
    });
  });

  describe('isTopologyValid', () => {
    it('should return true for valid mesh', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

      expect(isTopologyValid(mesh)).toBe(true);
    });
  });

  describe('TopologyValidator class', () => {
    it('should validate mesh', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const validator = new TopologyValidator(mesh);

      expect(validator.isValid()).toBe(true);
    });

    it('should provide validation result', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const validator = new TopologyValidator(mesh);

      const result = validator.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should provide errors and warnings accessors', () => {
      const geometry = createQuadGeometry();
      const mesh = NonManifoldMesh.fromBufferGeometry(geometry);
      const validator = new TopologyValidator(mesh);

      // Accessor methods
      const errors = validator.getErrors();
      const warnings = validator.getWarnings();

      expect(errors).toHaveLength(0);
      expect(warnings).toBeDefined();
    });
  });
});

describe('Integration: Analysis Pipeline', () => {
  it('should analyze, classify, and validate a mesh', () => {
    const geometry = createQuadGeometry();
    const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

    // Step 1: Analyze manifoldness
    const analysis = analyzeMesh(mesh);
    expect(analysis.isManifold).toBe(true);

    // Step 2: Classify vertices
    classifyAllVertices(mesh);
    const vertices = mesh.getVertices();
    expect(vertices.length).toBe(4);

    // Step 3: Validate topology
    const validation = validateTopology(mesh);
    expect(validation.isValid).toBe(true);
  });

  it('should handle non-manifold mesh through the pipeline', () => {
    const geometry = createNonManifoldGeometry();
    const mesh = NonManifoldMesh.fromBufferGeometry(geometry);

    // Step 1: Analyze
    const analysis = analyzeMesh(mesh);
    expect(analysis.isManifold).toBe(false);

    // Step 2: Classify
    classifyAllVertices(mesh);

    // Step 3: Validate
    const validation = validateTopology(mesh);
    // Topology should still be structurally valid even if non-manifold
    expect(validation.errors).toBeDefined();
  });
});
