// Main API
export { MeshRepairer } from './MeshRepairer';

// Functional API
export {
  repairMesh,
  removeIsolatedVertices,
  removeDegenerateFaces,
  removeDuplicateFaces,
} from './RepairFunctions';

// Types
export type {
  RepairOptions,
  RepairStats,
  RepairResult,
  OperationStats,
  DefectInfo,
} from './RepairStats';

// Operations (for advanced usage)
export { RepairOperation } from './operations/RepairOperation';
export { IsolatedVertexRepair } from './operations/IsolatedVertexRepair';
export { DegenerateFaceRepair } from './operations/DegenerateFaceRepair';
export { DuplicateFaceRepair } from './operations/DuplicateFaceRepair';
