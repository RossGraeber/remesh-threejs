import { Vector3, type BufferGeometry } from 'three';
import { Vertex } from './Vertex';
import { Edge, Halfedge } from './Edge';
import { Face } from './Face';
import {
  createVertexId,
  createEdgeId,
  createHalfedgeId,
  createFaceId,
  type VertexId,
  type EdgeId,
  type HalfedgeId,
  type FaceId,
} from '../types/MeshData';
import { EdgeType, VertexType } from '../types/SkeletonData';
import type { FeatureEdge } from '../types/RemeshOptions';

/**
 * Represents a non-manifold mesh using an extended halfedge data structure.
 * Supports edges with more than 2 incident faces (non-manifold seams).
 */
export class NonManifoldMesh {
  public vertices: Map<VertexId, Vertex> = new Map();
  public edges: Map<EdgeId, Edge> = new Map();
  public halfedges: Map<HalfedgeId, Halfedge> = new Map();
  public faces: Map<FaceId, Face> = new Map();

  private nextVertexId = 0;
  private nextEdgeId = 0;
  private nextHalfedgeId = 0;
  private nextFaceId = 0;

  /** Map from vertex pair key to edge for fast lookup */
  private edgeMap: Map<string, Edge> = new Map();

  /**
   * Creates a non-manifold mesh from a Three.js BufferGeometry.
   *
   * @param geometry - The input geometry (must be indexed triangles)
   * @param featureEdges - Optional user-defined feature edges to preserve
   */
  static fromBufferGeometry(
    geometry: BufferGeometry,
    featureEdges?: FeatureEdge[]
  ): NonManifoldMesh {
    const mesh = new NonManifoldMesh();

    // Get position attribute
    const positions = geometry.attributes['position'];
    if (!positions) {
      throw new Error('Geometry must have a position attribute');
    }

    // Get index attribute
    const indices = geometry.index;
    if (!indices) {
      throw new Error('Geometry must be indexed');
    }

    const numVertices = positions.count;
    const numFaces = indices.count / 3;

    if (indices.count % 3 !== 0) {
      throw new Error('Geometry must be triangulated (indices count must be divisible by 3)');
    }

    // Create vertices
    for (let i = 0; i < numVertices; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const vertex = new Vertex(createVertexId(mesh.nextVertexId++), new Vector3(x, y, z));
      mesh.vertices.set(vertex.id, vertex);
    }

    // Create faces and halfedges
    for (let i = 0; i < numFaces; i++) {
      const i0 = indices.getX(i * 3 + 0);
      const i1 = indices.getX(i * 3 + 1);
      const i2 = indices.getX(i * 3 + 2);

      const v0 = mesh.vertices.get(createVertexId(i0));
      const v1 = mesh.vertices.get(createVertexId(i1));
      const v2 = mesh.vertices.get(createVertexId(i2));

      if (!v0 || !v1 || !v2) {
        throw new Error(`Vertex not found in face ${i}: ${i0}, ${i1}, ${i2}`);
      }

      // Get or create edges
      const edge01 = mesh.getOrCreateEdge(i0, i1);
      const edge12 = mesh.getOrCreateEdge(i1, i2);
      const edge20 = mesh.getOrCreateEdge(i2, i0);

      // Create face
      const face = new Face(createFaceId(mesh.nextFaceId++), null as unknown as Halfedge);
      mesh.faces.set(face.id, face);

      // Create halfedges
      const he01 = new Halfedge(createHalfedgeId(mesh.nextHalfedgeId++), v1, edge01);
      const he12 = new Halfedge(createHalfedgeId(mesh.nextHalfedgeId++), v2, edge12);
      const he20 = new Halfedge(createHalfedgeId(mesh.nextHalfedgeId++), v0, edge20);

      mesh.halfedges.set(he01.id, he01);
      mesh.halfedges.set(he12.id, he12);
      mesh.halfedges.set(he20.id, he20);

      // Add halfedges to their edges
      edge01.addHalfedge(he01);
      edge12.addHalfedge(he12);
      edge20.addHalfedge(he20);

      // Set up halfedge connectivity for this face
      he01.next = he12;
      he12.next = he20;
      he20.next = he01;

      he01.prev = he20;
      he12.prev = he01;
      he20.prev = he12;

      he01.face = face;
      he12.face = face;
      he20.face = face;

      // Set face's halfedge
      face.halfedge = he01;

      // Set vertex outgoing halfedge (if not already set)
      if (!v0.halfedge) v0.halfedge = he01;
      if (!v1.halfedge) v1.halfedge = he12;
      if (!v2.halfedge) v2.halfedge = he20;

      // Update edge's primary halfedge to the most recently created one
      edge01.halfedge = he01;
      edge12.halfedge = he12;
      edge20.halfedge = he20;
    }

    // Set up twin halfedges (handles non-manifold edges)
    mesh.setupTwinHalfedges();

    // Mark feature edges
    if (featureEdges && featureEdges.length > 0) {
      mesh.markFeatureEdges(featureEdges);
    }

    // Classify vertices based on neighborhood topology
    mesh.classifyVertices();

    return mesh;
  }

  /**
   * Gets or creates an edge between two vertices.
   */
  private getOrCreateEdge(v0Id: number, v1Id: number): Edge {
    const key = this.makeEdgeKey(v0Id, v1Id);
    let edge = this.edgeMap.get(key);

    if (!edge) {
      const v0 = this.vertices.get(createVertexId(v0Id));
      const v1 = this.vertices.get(createVertexId(v1Id));
      if (!v0 || !v1) {
        throw new Error(`Vertex not found: ${v0Id} or ${v1Id}`);
      }

      // Calculate edge length from 3D positions
      const dx = v1.position.x - v0.position.x;
      const dy = v1.position.y - v0.position.y;
      const dz = v1.position.z - v0.position.z;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Create edge with placeholder halfedge
      edge = new Edge(createEdgeId(this.nextEdgeId++), null as unknown as Halfedge, length);
      // Clear allHalfedges since it was initialized with the placeholder
      edge.allHalfedges = [];
      this.edgeMap.set(key, edge);
      this.edges.set(edge.id, edge);
    }

    return edge;
  }

  /**
   * Creates a canonical key for an edge between two vertices.
   */
  private makeEdgeKey(v0Id: number, v1Id: number): string {
    return v0Id < v1Id ? `${v0Id},${v1Id}` : `${v1Id},${v0Id}`;
  }

  /**
   * Sets up twin halfedge relationships.
   * For non-manifold edges (>2 halfedges), creates a circular twin chain.
   */
  private setupTwinHalfedges(): void {
    for (const edge of this.edges.values()) {
      const halfedges = edge.allHalfedges;
      const count = halfedges.length;

      if (count === 0) {
        continue;
      }

      if (count === 1) {
        // Boundary edge - no twin
        halfedges[0]!.twin = null;
        edge.type = EdgeType.Boundary;
      } else if (count === 2) {
        // Standard manifold edge
        halfedges[0]!.twin = halfedges[1]!;
        halfedges[1]!.twin = halfedges[0]!;
        edge.type = EdgeType.Manifold;
      } else {
        // Non-manifold edge (>2 halfedges)
        // Group by direction and set up twins for opposite pairs
        this.setupNonManifoldTwins(edge, halfedges);
        edge.type = EdgeType.NonManifold;
      }
    }

    // Update vertex halfedges to prefer interior edges
    for (const he of this.halfedges.values()) {
      if (he.twin !== null) {
        const vertex = he.prev?.vertex;
        if (vertex) {
          vertex.halfedge = he;
        }
      }
    }
  }

  /**
   * Sets up twin relationships for non-manifold edges.
   * Groups halfedges by direction and pairs them appropriately.
   */
  private setupNonManifoldTwins(edge: Edge, halfedges: Halfedge[]): void {
    // Group halfedges by their direction (which vertex they point to)
    const [v0, v1] = edge.getVertices();
    if (!v0 || !v1) return;

    const toV0: Halfedge[] = [];
    const toV1: Halfedge[] = [];

    for (const he of halfedges) {
      if (he.vertex.id === v0.id) {
        toV0.push(he);
      } else {
        toV1.push(he);
      }
    }

    // Pair halfedges in opposite directions
    // If counts are unequal, some will not have twins
    const minCount = Math.min(toV0.length, toV1.length);

    for (let i = 0; i < minCount; i++) {
      toV0[i]!.twin = toV1[i]!;
      toV1[i]!.twin = toV0[i]!;
    }

    // Remaining unpaired halfedges have null twins (like boundary)
    for (let i = minCount; i < toV0.length; i++) {
      toV0[i]!.twin = null;
    }
    for (let i = minCount; i < toV1.length; i++) {
      toV1[i]!.twin = null;
    }
  }

  /**
   * Marks user-defined feature edges.
   */
  markFeatureEdges(featureEdges: FeatureEdge[]): void {
    for (const [v0, v1] of featureEdges) {
      const key = this.makeEdgeKey(v0, v1);
      const edge = this.edgeMap.get(key);
      if (edge && edge.type === EdgeType.Manifold) {
        edge.markAsFeature();
      }
    }
  }

  /**
   * Classifies all vertices based on their neighborhood topology.
   */
  classifyVertices(): void {
    for (const vertex of this.vertices.values()) {
      vertex.type = this.classifyVertex(vertex);
    }
  }

  /**
   * Classifies a single vertex based on its neighborhood.
   */
  private classifyVertex(vertex: Vertex): VertexType {
    // Count skeleton edges incident to this vertex
    let skeletonEdgeCount = 0;

    vertex.forEachOutgoingHalfedge((he) => {
      if (he.edge.isSkeletonEdge()) {
        skeletonEdgeCount++;
      }
    });

    if (skeletonEdgeCount === 0) {
      // No skeleton edges - manifold vertex
      return VertexType.Manifold;
    } else if (skeletonEdgeCount === 2) {
      // Exactly 2 skeleton edges - open-book vertex
      return VertexType.OpenBook;
    } else {
      // 1 or >2 skeleton edges - branching vertex
      return VertexType.SkeletonBranching;
    }
  }

  /**
   * Exports the mesh to a Three.js BufferGeometry.
   */
  toBufferGeometry(): BufferGeometry {
    const geometry = new (Vector3.constructor as unknown as typeof BufferGeometry)();

    // This will be implemented in BufferGeometryExporter
    // For now, just return an empty geometry
    return geometry;
  }

  /**
   * Gets all vertices in the mesh.
   */
  getVertices(): Vertex[] {
    return Array.from(this.vertices.values());
  }

  /**
   * Gets all edges in the mesh.
   */
  getEdges(): Edge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Gets all faces in the mesh.
   */
  getFaces(): Face[] {
    return Array.from(this.faces.values());
  }

  /**
   * Gets all halfedges in the mesh.
   */
  getHalfedges(): Halfedge[] {
    return Array.from(this.halfedges.values());
  }

  /**
   * Gets the vertex count.
   */
  get vertexCount(): number {
    return this.vertices.size;
  }

  /**
   * Gets the edge count.
   */
  get edgeCount(): number {
    return this.edges.size;
  }

  /**
   * Gets the face count.
   */
  get faceCount(): number {
    return this.faces.size;
  }

  /**
   * Gets the halfedge count.
   */
  get halfedgeCount(): number {
    return this.halfedges.size;
  }

  /**
   * Gets all non-manifold edges.
   */
  getNonManifoldEdges(): Edge[] {
    return this.getEdges().filter((e) => e.type === EdgeType.NonManifold);
  }

  /**
   * Gets all boundary edges.
   */
  getBoundaryEdges(): Edge[] {
    return this.getEdges().filter((e) => e.type === EdgeType.Boundary);
  }

  /**
   * Gets all feature edges.
   */
  getFeatureEdges(): Edge[] {
    return this.getEdges().filter((e) => e.type === EdgeType.Feature);
  }

  /**
   * Gets all skeleton edges (non-manifold + boundary + feature).
   */
  getSkeletonEdges(): Edge[] {
    return this.getEdges().filter((e) => e.isSkeletonEdge());
  }

  /**
   * Checks if the mesh is manifold (no non-manifold edges).
   */
  isManifold(): boolean {
    return this.getNonManifoldEdges().length === 0;
  }

  /**
   * Checks if the mesh has boundaries.
   */
  hasBoundary(): boolean {
    return this.getBoundaryEdges().length > 0;
  }

  /**
   * Gets a vertex by ID.
   */
  getVertex(id: VertexId): Vertex | undefined {
    return this.vertices.get(id);
  }

  /**
   * Gets an edge by ID.
   */
  getEdge(id: EdgeId): Edge | undefined {
    return this.edges.get(id);
  }

  /**
   * Gets a face by ID.
   */
  getFace(id: FaceId): Face | undefined {
    return this.faces.get(id);
  }

  /**
   * Gets a halfedge by ID.
   */
  getHalfedge(id: HalfedgeId): Halfedge | undefined {
    return this.halfedges.get(id);
  }

  /**
   * Gets the edge between two vertices (if it exists).
   */
  getEdgeBetween(v0: Vertex, v1: Vertex): Edge | undefined {
    const key = this.makeEdgeKey(v0.id as number, v1.id as number);
    return this.edgeMap.get(key);
  }

  /**
   * Creates a new vertex and adds it to the mesh.
   */
  createVertex(position: Vector3): Vertex {
    const vertex = new Vertex(createVertexId(this.nextVertexId++), position);
    this.vertices.set(vertex.id, vertex);
    return vertex;
  }

  /**
   * Creates a new face from three vertices.
   * Also creates the necessary halfedges and edges.
   */
  createFace(v0: Vertex, v1: Vertex, v2: Vertex): Face {
    // Get or create edges
    const edge01 = this.getOrCreateEdge(v0.id as number, v1.id as number);
    const edge12 = this.getOrCreateEdge(v1.id as number, v2.id as number);
    const edge20 = this.getOrCreateEdge(v2.id as number, v0.id as number);

    // Create face
    const face = new Face(createFaceId(this.nextFaceId++), null as unknown as Halfedge);
    this.faces.set(face.id, face);

    // Create halfedges
    const he01 = new Halfedge(createHalfedgeId(this.nextHalfedgeId++), v1, edge01);
    const he12 = new Halfedge(createHalfedgeId(this.nextHalfedgeId++), v2, edge12);
    const he20 = new Halfedge(createHalfedgeId(this.nextHalfedgeId++), v0, edge20);

    this.halfedges.set(he01.id, he01);
    this.halfedges.set(he12.id, he12);
    this.halfedges.set(he20.id, he20);

    // Add to edges
    edge01.addHalfedge(he01);
    edge12.addHalfedge(he12);
    edge20.addHalfedge(he20);

    // Set up halfedge connectivity
    he01.next = he12;
    he12.next = he20;
    he20.next = he01;

    he01.prev = he20;
    he12.prev = he01;
    he20.prev = he12;

    he01.face = face;
    he12.face = face;
    he20.face = face;

    face.halfedge = he01;

    // Update vertex halfedges
    if (!v0.halfedge) v0.halfedge = he01;
    if (!v1.halfedge) v1.halfedge = he12;
    if (!v2.halfedge) v2.halfedge = he20;

    // Update edge primary halfedges
    edge01.halfedge = he01;
    edge12.halfedge = he12;
    edge20.halfedge = he20;

    return face;
  }

  /**
   * Computes mesh statistics.
   */
  getStats(): {
    vertexCount: number;
    edgeCount: number;
    faceCount: number;
    nonManifoldEdgeCount: number;
    boundaryEdgeCount: number;
    featureEdgeCount: number;
    eulerCharacteristic: number;
  } {
    const nonManifoldEdgeCount = this.getNonManifoldEdges().length;
    const boundaryEdgeCount = this.getBoundaryEdges().length;
    const featureEdgeCount = this.getFeatureEdges().length;

    // Euler characteristic: V - E + F
    const eulerCharacteristic = this.vertexCount - this.edgeCount + this.faceCount;

    return {
      vertexCount: this.vertexCount,
      edgeCount: this.edgeCount,
      faceCount: this.faceCount,
      nonManifoldEdgeCount,
      boundaryEdgeCount,
      featureEdgeCount,
      eulerCharacteristic,
    };
  }
}
