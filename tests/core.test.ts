import { describe, it, expect, beforeEach } from 'vitest';
import { Vector3 } from 'three';
import { Vertex } from '../src/core/Vertex';
import { Edge, Halfedge } from '../src/core/Edge';
import { Face } from '../src/core/Face';
import {
  createVertexId,
  createEdgeId,
  createHalfedgeId,
  createFaceId,
} from '../src/types/MeshData';
import { VertexType, EdgeType } from '../src/types/SkeletonData';

describe('Vertex', () => {
  describe('constructor', () => {
    it('should create a vertex with id and position', () => {
      const id = createVertexId(0);
      const position = new Vector3(1, 2, 3);
      const vertex = new Vertex(id, position);

      expect(vertex.id).toBe(id);
      expect(vertex.position.x).toBe(1);
      expect(vertex.position.y).toBe(2);
      expect(vertex.position.z).toBe(3);
    });

    it('should initialize with default values', () => {
      const vertex = new Vertex(createVertexId(0), new Vector3());

      expect(vertex.halfedge).toBeNull();
      expect(vertex.type).toBe(VertexType.Manifold);
      expect(vertex.isMarked).toBe(false);
    });
  });

  describe('degree', () => {
    it('should return null for isolated vertex', () => {
      const vertex = new Vertex(createVertexId(0), new Vector3());
      expect(vertex.degree()).toBeNull();
    });
  });

  describe('movement constraints', () => {
    it('should allow free movement for manifold vertices', () => {
      const vertex = new Vertex(createVertexId(0), new Vector3());
      vertex.type = VertexType.Manifold;

      expect(vertex.canMoveFreely()).toBe(true);
      expect(vertex.isSkeletonConstrained()).toBe(false);
      expect(vertex.isPositionFixed()).toBe(false);
      expect(vertex.isOnSkeleton()).toBe(false);
    });

    it('should constrain OpenBook vertices to skeleton', () => {
      const vertex = new Vertex(createVertexId(0), new Vector3());
      vertex.type = VertexType.OpenBook;

      expect(vertex.canMoveFreely()).toBe(false);
      expect(vertex.isSkeletonConstrained()).toBe(true);
      expect(vertex.isPositionFixed()).toBe(false);
      expect(vertex.isOnSkeleton()).toBe(true);
    });

    it('should fix SkeletonBranching vertices', () => {
      const vertex = new Vertex(createVertexId(0), new Vector3());
      vertex.type = VertexType.SkeletonBranching;

      expect(vertex.canMoveFreely()).toBe(false);
      expect(vertex.isSkeletonConstrained()).toBe(false);
      expect(vertex.isPositionFixed()).toBe(true);
      expect(vertex.isOnSkeleton()).toBe(true);
    });

    it('should fix NonManifoldOther vertices', () => {
      const vertex = new Vertex(createVertexId(0), new Vector3());
      vertex.type = VertexType.NonManifoldOther;

      expect(vertex.canMoveFreely()).toBe(false);
      expect(vertex.isSkeletonConstrained()).toBe(false);
      expect(vertex.isPositionFixed()).toBe(true);
      expect(vertex.isOnSkeleton()).toBe(true);
    });
  });

  describe('isBoundary', () => {
    it('should return true for vertex with no halfedge', () => {
      const vertex = new Vertex(createVertexId(0), new Vector3());
      expect(vertex.isBoundary()).toBe(true);
    });
  });
});

describe('Edge', () => {
  let v0: Vertex;
  let v1: Vertex;
  let edge: Edge;
  let halfedge: Halfedge;

  beforeEach(() => {
    v0 = new Vertex(createVertexId(0), new Vector3(0, 0, 0));
    v1 = new Vertex(createVertexId(1), new Vector3(1, 0, 0));

    // Create a halfedge pointing to v1
    const edgeId = createEdgeId(0);
    halfedge = new Halfedge(createHalfedgeId(0), v1, null as unknown as Edge);
    edge = new Edge(edgeId, halfedge, 1.0);
    halfedge.edge = edge;
  });

  describe('constructor', () => {
    it('should create an edge with id, halfedge, and length', () => {
      expect(edge.id).toBe(createEdgeId(0));
      expect(edge.halfedge).toBe(halfedge);
      expect(edge.length).toBe(1.0);
    });

    it('should initialize with default values', () => {
      expect(edge.type).toBe(EdgeType.Manifold);
      expect(edge.isInPath).toBe(false);
      expect(edge.allHalfedges).toContain(halfedge);
    });
  });

  describe('getHalfedgeCount', () => {
    it('should return 1 for new edge with one halfedge', () => {
      expect(edge.getHalfedgeCount()).toBe(1);
    });

    it('should return correct count after adding halfedges', () => {
      const he2 = new Halfedge(createHalfedgeId(1), v0, edge);
      edge.addHalfedge(he2);
      expect(edge.getHalfedgeCount()).toBe(2);
    });
  });

  describe('edge type classification', () => {
    it('should classify as boundary when no faces', () => {
      edge.updateType();
      expect(edge.type).toBe(EdgeType.Boundary);
    });

    it('should detect non-manifold edges', () => {
      expect(edge.isNonManifold()).toBe(false);
      edge.type = EdgeType.NonManifold;
      expect(edge.isNonManifold()).toBe(true);
    });

    it('should detect skeleton edges', () => {
      edge.type = EdgeType.Manifold;
      expect(edge.isSkeletonEdge()).toBe(false);

      edge.type = EdgeType.NonManifold;
      expect(edge.isSkeletonEdge()).toBe(true);

      edge.type = EdgeType.Feature;
      expect(edge.isSkeletonEdge()).toBe(true);

      edge.type = EdgeType.Boundary;
      expect(edge.isSkeletonEdge()).toBe(true);
    });
  });

  describe('markAsFeature', () => {
    it('should mark manifold edge as feature', () => {
      edge.type = EdgeType.Manifold;
      edge.markAsFeature();
      expect(edge.type).toBe(EdgeType.Feature);
    });

    it('should not change non-manifold edge type', () => {
      edge.type = EdgeType.NonManifold;
      edge.markAsFeature();
      expect(edge.type).toBe(EdgeType.NonManifold);
    });
  });

  describe('canFlip', () => {
    it('should return false for non-manifold edges', () => {
      edge.type = EdgeType.NonManifold;
      expect(edge.canFlip()).toBe(false);
    });

    it('should return false for feature edges', () => {
      edge.type = EdgeType.Feature;
      expect(edge.canFlip()).toBe(false);
    });

    it('should return false for boundary edges', () => {
      edge.type = EdgeType.Boundary;
      expect(edge.canFlip()).toBe(false);
    });
  });
});

describe('Halfedge', () => {
  let v0: Vertex;
  let v1: Vertex;
  let edge: Edge;
  let he0: Halfedge;
  let he1: Halfedge;

  beforeEach(() => {
    v0 = new Vertex(createVertexId(0), new Vector3(0, 0, 0));
    v1 = new Vertex(createVertexId(1), new Vector3(1, 0, 0));

    // Create edge and halfedges
    he0 = new Halfedge(createHalfedgeId(0), v1, null as unknown as Edge);
    he1 = new Halfedge(createHalfedgeId(1), v0, null as unknown as Edge);

    edge = new Edge(createEdgeId(0), he0, 1.0);
    he0.edge = edge;
    he1.edge = edge;
    edge.addHalfedge(he1);

    // Set up twin relationship
    he0.twin = he1;
    he1.twin = he0;
  });

  describe('getSourceVertex', () => {
    it('should return twin target vertex', () => {
      expect(he0.getSourceVertex()).toBe(v0);
      expect(he1.getSourceVertex()).toBe(v1);
    });

    it('should return null if no twin', () => {
      he0.twin = null;
      expect(he0.getSourceVertex()).toBeNull();
    });
  });

  describe('getTargetVertex', () => {
    it('should return the vertex this halfedge points to', () => {
      expect(he0.getTargetVertex()).toBe(v1);
      expect(he1.getTargetVertex()).toBe(v0);
    });
  });

  describe('isBoundary', () => {
    it('should return true when face is null', () => {
      expect(he0.isBoundary()).toBe(true);
    });
  });

  describe('getVector', () => {
    it('should compute vector from source to target', () => {
      const vec = he0.getVector();
      expect(vec).toEqual({ x: 1, y: 0, z: 0 });
    });

    it('should return null if no source vertex', () => {
      he0.twin = null;
      expect(he0.getVector()).toBeNull();
    });
  });
});

describe('Face', () => {
  let v0: Vertex;
  let v1: Vertex;
  let v2: Vertex;
  let face: Face;
  let he0: Halfedge;
  let he1: Halfedge;
  let he2: Halfedge;

  beforeEach(() => {
    // Create an equilateral triangle at z=0
    v0 = new Vertex(createVertexId(0), new Vector3(0, 0, 0));
    v1 = new Vertex(createVertexId(1), new Vector3(1, 0, 0));
    v2 = new Vertex(createVertexId(2), new Vector3(0.5, Math.sqrt(3) / 2, 0));

    // Create edges
    const e0 = new Edge(createEdgeId(0), null as unknown as Halfedge, 1.0);
    const e1 = new Edge(createEdgeId(1), null as unknown as Halfedge, 1.0);
    const e2 = new Edge(createEdgeId(2), null as unknown as Halfedge, 1.0);

    // Create halfedges forming a loop
    he0 = new Halfedge(createHalfedgeId(0), v1, e0);
    he1 = new Halfedge(createHalfedgeId(1), v2, e1);
    he2 = new Halfedge(createHalfedgeId(2), v0, e2);

    e0.halfedge = he0;
    e1.halfedge = he1;
    e2.halfedge = he2;

    // Link halfedges in a loop
    he0.next = he1;
    he1.next = he2;
    he2.next = he0;

    he0.prev = he2;
    he1.prev = he0;
    he2.prev = he1;

    // Create twin halfedges
    const he0Twin = new Halfedge(createHalfedgeId(3), v0, e0);
    const he1Twin = new Halfedge(createHalfedgeId(4), v1, e1);
    const he2Twin = new Halfedge(createHalfedgeId(5), v2, e2);

    he0.twin = he0Twin;
    he0Twin.twin = he0;
    he1.twin = he1Twin;
    he1Twin.twin = he1;
    he2.twin = he2Twin;
    he2Twin.twin = he2;

    // Create face
    face = new Face(createFaceId(0), he0);

    // Assign face to halfedges
    he0.face = face;
    he1.face = face;
    he2.face = face;
  });

  describe('getVertices', () => {
    it('should return all three vertices in order', () => {
      const vertices = face.getVertices();
      expect(vertices).not.toBeNull();
      expect(vertices![0]).toBe(v1);
      expect(vertices![1]).toBe(v2);
      expect(vertices![2]).toBe(v0);
    });
  });

  describe('getHalfedges', () => {
    it('should return all three halfedges', () => {
      const halfedges = face.getHalfedges();
      expect(halfedges).not.toBeNull();
      expect(halfedges).toHaveLength(3);
    });
  });

  describe('getCentroid', () => {
    it('should compute the center of the triangle', () => {
      const centroid = face.getCentroid();
      expect(centroid).not.toBeNull();
      expect(centroid!.x).toBeCloseTo(0.5);
      expect(centroid!.y).toBeCloseTo(Math.sqrt(3) / 6);
      expect(centroid!.z).toBeCloseTo(0);
    });
  });

  describe('getNormal', () => {
    it('should compute the face normal', () => {
      const normal = face.getNormal();
      expect(normal).not.toBeNull();
      // Triangle in XY plane should have normal along Z
      expect(normal!.x).toBeCloseTo(0);
      expect(normal!.y).toBeCloseTo(0);
      expect(Math.abs(normal!.z)).toBeCloseTo(1);
    });
  });

  describe('getArea', () => {
    it('should compute the triangle area', () => {
      const area = face.getArea();
      expect(area).not.toBeNull();
      // Area of equilateral triangle with side 1 = sqrt(3)/4
      expect(area).toBeCloseTo(Math.sqrt(3) / 4);
    });
  });

  describe('getQuality', () => {
    it('should return 1.0 for equilateral triangle', () => {
      const quality = face.getQuality();
      expect(quality).not.toBeNull();
      expect(quality).toBeCloseTo(1.0, 1);
    });

    it('should return lower quality for elongated triangles', () => {
      // Create a very elongated triangle
      v2.position.set(0.5, 0.01, 0);
      const quality = face.getQuality();
      expect(quality).not.toBeNull();
      expect(quality!).toBeLessThan(0.5);
    });
  });

  describe('containsVertex', () => {
    it('should return true for vertices in the face', () => {
      expect(face.containsVertex(v0)).toBe(true);
      expect(face.containsVertex(v1)).toBe(true);
      expect(face.containsVertex(v2)).toBe(true);
    });

    it('should return false for vertices not in the face', () => {
      const v3 = new Vertex(createVertexId(3), new Vector3(10, 10, 10));
      expect(face.containsVertex(v3)).toBe(false);
    });
  });

  describe('isDegenerate', () => {
    it('should return false for normal triangles', () => {
      expect(face.isDegenerate()).toBe(false);
    });

    it('should return true for degenerate triangles', () => {
      // Collapse triangle to a line
      v2.position.set(0.5, 0, 0);
      expect(face.isDegenerate()).toBe(true);
    });
  });
});
