import type { NonManifoldMesh } from '../core/NonManifoldMesh';

/**
 * A validation error.
 */
export interface ValidationError {
  /** Type of the error */
  type: string;

  /** Human-readable message */
  message: string;

  /** Related element IDs */
  elementIds?: number[];
}

/**
 * Result of topology validation.
 */
export interface TopologyValidationResult {
  /** Whether the mesh topology is valid */
  isValid: boolean;

  /** List of errors found */
  errors: ValidationError[];

  /** List of warnings */
  warnings: ValidationError[];
}

/**
 * Validates the topology of a mesh.
 *
 * @param mesh - The mesh to validate
 * @returns Validation result
 */
export function validateTopology(mesh: NonManifoldMesh): TopologyValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate vertices
  validateVertices(mesh, errors, warnings);

  // Validate edges
  validateEdges(mesh, errors, warnings);

  // Validate faces
  validateFaces(mesh, errors, warnings);

  // Validate halfedge connectivity
  validateHalfedgeConnectivity(mesh, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates vertex references.
 */
function validateVertices(
  mesh: NonManifoldMesh,
  errors: ValidationError[],
  _warnings: ValidationError[]
): void {
  for (const vertex of mesh.getVertices()) {
    // Check halfedge reference
    if (vertex.halfedge) {
      if (!mesh.getHalfedge(vertex.halfedge.id)) {
        errors.push({
          type: 'invalid_vertex_halfedge',
          message: `Vertex ${vertex.id} references non-existent halfedge ${vertex.halfedge.id}`,
          elementIds: [vertex.id as number],
        });
      }
    }

    // Check for valid position
    if (
      !isFinite(vertex.position.x) ||
      !isFinite(vertex.position.y) ||
      !isFinite(vertex.position.z)
    ) {
      errors.push({
        type: 'invalid_vertex_position',
        message: `Vertex ${vertex.id} has invalid position`,
        elementIds: [vertex.id as number],
      });
    }
  }
}

/**
 * Validates edge references.
 */
function validateEdges(
  mesh: NonManifoldMesh,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  for (const edge of mesh.getEdges()) {
    // Check that edge has at least one halfedge
    if (edge.allHalfedges.length === 0) {
      errors.push({
        type: 'edge_no_halfedges',
        message: `Edge ${edge.id} has no halfedges`,
        elementIds: [edge.id as number],
      });
      continue;
    }

    // Check primary halfedge reference
    if (!mesh.getHalfedge(edge.halfedge.id)) {
      errors.push({
        type: 'invalid_edge_halfedge',
        message: `Edge ${edge.id} references non-existent halfedge`,
        elementIds: [edge.id as number],
      });
    }

    // Check edge length
    if (edge.length <= 0 || !isFinite(edge.length)) {
      warnings.push({
        type: 'invalid_edge_length',
        message: `Edge ${edge.id} has invalid length: ${edge.length}`,
        elementIds: [edge.id as number],
      });
    }

    // Validate all halfedges reference this edge
    for (const he of edge.allHalfedges) {
      if (he.edge.id !== edge.id) {
        errors.push({
          type: 'halfedge_edge_mismatch',
          message: `Halfedge ${he.id} in edge ${edge.id} references different edge ${he.edge.id}`,
          elementIds: [edge.id as number, he.id as number],
        });
      }
    }
  }
}

/**
 * Validates face references.
 */
function validateFaces(
  mesh: NonManifoldMesh,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  for (const face of mesh.getFaces()) {
    // Check halfedge reference
    if (!face.halfedge) {
      errors.push({
        type: 'face_no_halfedge',
        message: `Face ${face.id} has no halfedge`,
        elementIds: [face.id as number],
      });
      continue;
    }

    if (!mesh.getHalfedge(face.halfedge.id)) {
      errors.push({
        type: 'invalid_face_halfedge',
        message: `Face ${face.id} references non-existent halfedge`,
        elementIds: [face.id as number],
      });
      continue;
    }

    // Check that face has exactly 3 halfedges (triangle)
    const halfedges = face.getHalfedges();
    if (!halfedges) {
      errors.push({
        type: 'face_invalid_loop',
        message: `Face ${face.id} has invalid halfedge loop`,
        elementIds: [face.id as number],
      });
      continue;
    }

    // Check that all halfedges reference this face
    for (const he of halfedges) {
      if (he.face?.id !== face.id) {
        errors.push({
          type: 'halfedge_face_mismatch',
          message: `Halfedge ${he.id} in face ${face.id} references different face`,
          elementIds: [face.id as number, he.id as number],
        });
      }
    }

    // Check for degenerate triangles
    if (face.isDegenerate()) {
      warnings.push({
        type: 'degenerate_face',
        message: `Face ${face.id} is degenerate (near-zero area)`,
        elementIds: [face.id as number],
      });
    }
  }
}

/**
 * Validates halfedge connectivity.
 */
function validateHalfedgeConnectivity(
  mesh: NonManifoldMesh,
  errors: ValidationError[],
  _warnings: ValidationError[]
): void {
  for (const he of mesh.getHalfedges()) {
    // Check next pointer
    if (!he.next) {
      errors.push({
        type: 'halfedge_no_next',
        message: `Halfedge ${he.id} has no next pointer`,
        elementIds: [he.id as number],
      });
    } else if (!mesh.getHalfedge(he.next.id)) {
      errors.push({
        type: 'halfedge_invalid_next',
        message: `Halfedge ${he.id} has invalid next pointer`,
        elementIds: [he.id as number],
      });
    }

    // Check prev pointer
    if (!he.prev) {
      errors.push({
        type: 'halfedge_no_prev',
        message: `Halfedge ${he.id} has no prev pointer`,
        elementIds: [he.id as number],
      });
    } else if (!mesh.getHalfedge(he.prev.id)) {
      errors.push({
        type: 'halfedge_invalid_prev',
        message: `Halfedge ${he.id} has invalid prev pointer`,
        elementIds: [he.id as number],
      });
    }

    // Check next/prev consistency
    if (he.next && he.next.prev !== he) {
      errors.push({
        type: 'halfedge_next_prev_mismatch',
        message: `Halfedge ${he.id}: next.prev does not point back`,
        elementIds: [he.id as number],
      });
    }

    if (he.prev && he.prev.next !== he) {
      errors.push({
        type: 'halfedge_prev_next_mismatch',
        message: `Halfedge ${he.id}: prev.next does not point back`,
        elementIds: [he.id as number],
      });
    }

    // Check twin consistency (if exists)
    if (he.twin) {
      if (!mesh.getHalfedge(he.twin.id)) {
        errors.push({
          type: 'halfedge_invalid_twin',
          message: `Halfedge ${he.id} has invalid twin pointer`,
          elementIds: [he.id as number],
        });
      } else if (he.twin.twin !== he) {
        errors.push({
          type: 'halfedge_twin_mismatch',
          message: `Halfedge ${he.id}: twin.twin does not point back`,
          elementIds: [he.id as number],
        });
      }
    }

    // Check vertex reference
    if (!mesh.getVertex(he.vertex.id)) {
      errors.push({
        type: 'halfedge_invalid_vertex',
        message: `Halfedge ${he.id} references non-existent vertex`,
        elementIds: [he.id as number],
      });
    }

    // Check edge reference
    if (!mesh.getEdge(he.edge.id)) {
      errors.push({
        type: 'halfedge_invalid_edge',
        message: `Halfedge ${he.id} references non-existent edge`,
        elementIds: [he.id as number],
      });
    }
  }
}

/**
 * Quick check if mesh topology is valid.
 */
export function isTopologyValid(mesh: NonManifoldMesh): boolean {
  return validateTopology(mesh).isValid;
}

/**
 * Class for topology validation.
 */
export class TopologyValidator {
  private mesh: NonManifoldMesh;

  constructor(mesh: NonManifoldMesh) {
    this.mesh = mesh;
  }

  /**
   * Validates the mesh topology.
   */
  validate(): TopologyValidationResult {
    return validateTopology(this.mesh);
  }

  /**
   * Quick check if topology is valid.
   */
  isValid(): boolean {
    return isTopologyValid(this.mesh);
  }

  /**
   * Gets all errors.
   */
  getErrors(): ValidationError[] {
    return this.validate().errors;
  }

  /**
   * Gets all warnings.
   */
  getWarnings(): ValidationError[] {
    return this.validate().warnings;
  }
}
