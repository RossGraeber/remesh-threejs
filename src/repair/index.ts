// Main API
export { MeshRepairer } from './MeshRepairer';

// Functional API
export {
  repairMesh,
  removeIsolatedVertices,
  removeDegenerateFaces,
  removeDuplicateFaces,
  removeNonManifoldEdges,
  fillHoles,
  unifyNormals,
} from './RepairFunctions';

// Types
export type {
  RepairOptions,
  RepairStats,
  RepairResult,
  OperationStats,
  DefectInfo,
} from './RepairStats';

export type { NonManifoldRepairStrategy } from './operations/NonManifoldEdgeRepair';

// Operations (for advanced usage)
export { RepairOperation } from './operations/RepairOperation';
export { IsolatedVertexRepair } from './operations/IsolatedVertexRepair';
export { DegenerateFaceRepair } from './operations/DegenerateFaceRepair';
export { DuplicateFaceRepair } from './operations/DuplicateFaceRepair';
export { NonManifoldEdgeRepair } from './operations/NonManifoldEdgeRepair';
export { HoleFiller } from './operations/HoleFiller';
export { NormalUnifier } from './operations/NormalUnifier';
