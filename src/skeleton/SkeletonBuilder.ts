import type { NonManifoldMesh } from '../core/NonManifoldMesh';
import type { Vertex } from '../core/Vertex';
import type { Edge } from '../core/Edge';
import { SkeletonSegment } from './SkeletonSegment';
import { VertexType } from '../types/SkeletonData';
import { createSegmentId, type SegmentId } from '../types/MeshData';

/**
 * Result of skeleton building.
 */
export interface SkeletonBuildResult {
  /** All segments in the skeleton */
  segments: SkeletonSegment[];

  /** All skeleton edges */
  skeletonEdges: Edge[];

  /** All branching vertices (endpoints of segments) */
  branchingVertices: Vertex[];

  /** All open-book vertices (interior of segments) */
  openBookVertices: Vertex[];
}

/**
 * Builds the feature skeleton from a mesh.
 * The skeleton consists of non-manifold edges, boundary edges, and feature edges.
 */
export class SkeletonBuilder {
  private mesh: NonManifoldMesh;
  private nextSegmentId: number = 0;

  constructor(mesh: NonManifoldMesh) {
    this.mesh = mesh;
  }

  /**
   * Builds the skeleton and returns the result.
   */
  build(): SkeletonBuildResult {
    const skeletonEdges = this.mesh.getSkeletonEdges();
    const branchingVertices: Vertex[] = [];
    const openBookVertices: Vertex[] = [];

    // Classify vertices
    for (const vertex of this.mesh.getVertices()) {
      if (vertex.type === VertexType.SkeletonBranching) {
        branchingVertices.push(vertex);
      } else if (vertex.type === VertexType.OpenBook) {
        openBookVertices.push(vertex);
      }
    }

    // Build segments
    const segments = this.buildSegments(skeletonEdges, branchingVertices);

    return {
      segments,
      skeletonEdges,
      branchingVertices,
      openBookVertices,
    };
  }

  /**
   * Builds segments from skeleton edges.
   * A segment is a path between two branching vertices.
   */
  private buildSegments(skeletonEdges: Edge[], branchingVertices: Vertex[]): SkeletonSegment[] {
    const segments: SkeletonSegment[] = [];
    const visitedEdges = new Set<number>();
    const branchingIds = new Set(branchingVertices.map((v) => v.id as number));

    // Start from each branching vertex and trace segments
    for (const startVertex of branchingVertices) {
      // Get all skeleton edges incident to this vertex
      const incidentEdges = this.getIncidentSkeletonEdges(startVertex, skeletonEdges);

      for (const startEdge of incidentEdges) {
        if (visitedEdges.has(startEdge.id as number)) {
          continue;
        }

        const segment = this.traceSegment(startVertex, startEdge, branchingIds, visitedEdges);

        if (segment) {
          segments.push(segment);
        }
      }
    }

    // Handle closed loops that don't contain branching vertices
    for (const edge of skeletonEdges) {
      if (visitedEdges.has(edge.id as number)) {
        continue;
      }

      const segment = this.traceClosedLoop(edge, visitedEdges);
      if (segment) {
        segments.push(segment);
      }
    }

    return segments;
  }

  /**
   * Gets skeleton edges incident to a vertex.
   */
  private getIncidentSkeletonEdges(vertex: Vertex, skeletonEdges: Edge[]): Edge[] {
    const skeletonEdgeSet = new Set(skeletonEdges.map((e) => e.id as number));
    const result: Edge[] = [];

    vertex.forEachOutgoingHalfedge((he) => {
      if (skeletonEdgeSet.has(he.edge.id as number)) {
        // Avoid duplicates
        if (!result.some((e) => e.id === he.edge.id)) {
          result.push(he.edge);
        }
      }
    });

    return result;
  }

  /**
   * Traces a segment from a starting vertex and edge.
   */
  private traceSegment(
    startVertex: Vertex,
    startEdge: Edge,
    branchingIds: Set<number>,
    visitedEdges: Set<number>
  ): SkeletonSegment | null {
    const segment = new SkeletonSegment(this.createSegmentId());
    segment.addVertex(startVertex);

    let currentVertex = startVertex;
    let currentEdge: Edge | null = startEdge;

    while (currentEdge && !visitedEdges.has(currentEdge.id as number)) {
      visitedEdges.add(currentEdge.id as number);
      segment.addEdge(currentEdge);

      // Get the other vertex of this edge
      const nextVertex = currentEdge.getOtherVertex(currentVertex);
      if (!nextVertex) {
        break;
      }

      segment.addVertex(nextVertex);
      currentVertex = nextVertex;

      // If we reached a branching vertex, stop
      if (branchingIds.has(currentVertex.id as number)) {
        break;
      }

      // Find the next skeleton edge (there should be exactly one for open-book vertices)
      currentEdge = this.getNextSkeletonEdge(currentVertex, currentEdge, visitedEdges);
    }

    // Check if segment forms a closed loop
    if (segment.vertices.length > 2 && segment.startVertex?.id === segment.endVertex?.id) {
      segment.isClosed = true;
      // Remove duplicate end vertex
      segment.vertices.pop();
    }

    segment.recomputeLengths();
    return segment;
  }

  /**
   * Traces a closed loop starting from an edge.
   */
  private traceClosedLoop(startEdge: Edge, visitedEdges: Set<number>): SkeletonSegment | null {
    const [v0, v1] = startEdge.getVertices();
    if (!v0 || !v1) {
      return null;
    }

    const segment = new SkeletonSegment(this.createSegmentId());
    segment.addVertex(v0);
    segment.addEdge(startEdge);
    segment.addVertex(v1);
    visitedEdges.add(startEdge.id as number);

    let currentVertex = v1;
    let currentEdge = this.getNextSkeletonEdge(currentVertex, startEdge, visitedEdges);

    while (currentEdge && !visitedEdges.has(currentEdge.id as number)) {
      visitedEdges.add(currentEdge.id as number);
      segment.addEdge(currentEdge);

      const nextVertex = currentEdge.getOtherVertex(currentVertex);
      if (!nextVertex) {
        break;
      }

      // Check if we've closed the loop
      if (nextVertex.id === v0.id) {
        segment.isClosed = true;
        break;
      }

      segment.addVertex(nextVertex);
      currentVertex = nextVertex;
      currentEdge = this.getNextSkeletonEdge(currentVertex, currentEdge, visitedEdges);
    }

    segment.recomputeLengths();
    return segment;
  }

  /**
   * Gets the next skeleton edge from a vertex, excluding the current edge.
   */
  private getNextSkeletonEdge(
    vertex: Vertex,
    currentEdge: Edge,
    visitedEdges: Set<number>
  ): Edge | null {
    let result: Edge | null = null;

    vertex.forEachOutgoingHalfedge((he) => {
      if (
        he.edge.id !== currentEdge.id &&
        he.edge.isSkeletonEdge() &&
        !visitedEdges.has(he.edge.id as number)
      ) {
        result = he.edge;
      }
    });

    return result;
  }

  /**
   * Creates a new segment ID.
   */
  private createSegmentId(): SegmentId {
    return createSegmentId(this.nextSegmentId++);
  }
}

/**
 * Builds the skeleton from a mesh.
 */
export function buildSkeleton(mesh: NonManifoldMesh): SkeletonBuildResult {
  const builder = new SkeletonBuilder(mesh);
  return builder.build();
}
