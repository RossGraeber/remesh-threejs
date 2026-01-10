import { describe, it, expect } from 'vitest';
import {
  createVertexId,
  createEdgeId,
  createHalfedgeId,
  createFaceId,
  createSegmentId,
  toNumber,
  VertexType,
  EdgeType,
  canMoveFreely,
  isSkeletonConstrained,
  isPositionFixed,
  isSkeletonEdge,
  canFlipEdge,
} from '../src/types';

describe('MeshData branded types', () => {
  describe('createVertexId', () => {
    it('should create a VertexId from a number', () => {
      const id = createVertexId(42);
      expect(toNumber(id)).toBe(42);
    });

    it('should create different IDs for different numbers', () => {
      const id1 = createVertexId(1);
      const id2 = createVertexId(2);
      expect(toNumber(id1)).not.toBe(toNumber(id2));
    });
  });

  describe('createEdgeId', () => {
    it('should create an EdgeId from a number', () => {
      const id = createEdgeId(100);
      expect(toNumber(id)).toBe(100);
    });
  });

  describe('createHalfedgeId', () => {
    it('should create a HalfedgeId from a number', () => {
      const id = createHalfedgeId(200);
      expect(toNumber(id)).toBe(200);
    });
  });

  describe('createFaceId', () => {
    it('should create a FaceId from a number', () => {
      const id = createFaceId(300);
      expect(toNumber(id)).toBe(300);
    });
  });

  describe('createSegmentId', () => {
    it('should create a SegmentId from a number', () => {
      const id = createSegmentId(400);
      expect(toNumber(id)).toBe(400);
    });
  });

  describe('toNumber', () => {
    it('should extract numeric value from any branded ID', () => {
      expect(toNumber(createVertexId(1))).toBe(1);
      expect(toNumber(createEdgeId(2))).toBe(2);
      expect(toNumber(createHalfedgeId(3))).toBe(3);
      expect(toNumber(createFaceId(4))).toBe(4);
      expect(toNumber(createSegmentId(5))).toBe(5);
    });
  });
});

describe('SkeletonData enums', () => {
  describe('VertexType', () => {
    it('should have correct enum values', () => {
      expect(VertexType.Manifold).toBe('manifold');
      expect(VertexType.OpenBook).toBe('open_book');
      expect(VertexType.SkeletonBranching).toBe('skeleton_branching');
      expect(VertexType.NonManifoldOther).toBe('non_manifold_other');
    });
  });

  describe('EdgeType', () => {
    it('should have correct enum values', () => {
      expect(EdgeType.Manifold).toBe('manifold');
      expect(EdgeType.NonManifold).toBe('non_manifold');
      expect(EdgeType.Feature).toBe('feature');
      expect(EdgeType.Boundary).toBe('boundary');
    });
  });
});

describe('SkeletonData helper functions', () => {
  describe('canMoveFreely', () => {
    it('should return true only for Manifold vertices', () => {
      expect(canMoveFreely(VertexType.Manifold)).toBe(true);
      expect(canMoveFreely(VertexType.OpenBook)).toBe(false);
      expect(canMoveFreely(VertexType.SkeletonBranching)).toBe(false);
      expect(canMoveFreely(VertexType.NonManifoldOther)).toBe(false);
    });
  });

  describe('isSkeletonConstrained', () => {
    it('should return true only for OpenBook vertices', () => {
      expect(isSkeletonConstrained(VertexType.Manifold)).toBe(false);
      expect(isSkeletonConstrained(VertexType.OpenBook)).toBe(true);
      expect(isSkeletonConstrained(VertexType.SkeletonBranching)).toBe(false);
      expect(isSkeletonConstrained(VertexType.NonManifoldOther)).toBe(false);
    });
  });

  describe('isPositionFixed', () => {
    it('should return true for SkeletonBranching and NonManifoldOther', () => {
      expect(isPositionFixed(VertexType.Manifold)).toBe(false);
      expect(isPositionFixed(VertexType.OpenBook)).toBe(false);
      expect(isPositionFixed(VertexType.SkeletonBranching)).toBe(true);
      expect(isPositionFixed(VertexType.NonManifoldOther)).toBe(true);
    });
  });

  describe('isSkeletonEdge', () => {
    it('should return true for NonManifold, Feature, and Boundary edges', () => {
      expect(isSkeletonEdge(EdgeType.Manifold)).toBe(false);
      expect(isSkeletonEdge(EdgeType.NonManifold)).toBe(true);
      expect(isSkeletonEdge(EdgeType.Feature)).toBe(true);
      expect(isSkeletonEdge(EdgeType.Boundary)).toBe(true);
    });
  });

  describe('canFlipEdge', () => {
    it('should return true only for Manifold edges', () => {
      expect(canFlipEdge(EdgeType.Manifold)).toBe(true);
      expect(canFlipEdge(EdgeType.NonManifold)).toBe(false);
      expect(canFlipEdge(EdgeType.Feature)).toBe(false);
      expect(canFlipEdge(EdgeType.Boundary)).toBe(false);
    });
  });
});
