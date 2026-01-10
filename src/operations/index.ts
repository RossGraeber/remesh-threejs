/**
 * Mesh operations for remeshing.
 */

export type { EdgeFlipResult } from './EdgeFlip';

export { canFlipEdge, flipEdge, isDelaunay, makeDelaunay, EdgeFlipper } from './EdgeFlip';

export type { EdgeSplitResult } from './EdgeSplit';

export { splitEdge, splitLongEdges, EdgeSplitter } from './EdgeSplit';

export type { EdgeContractionResult } from './EdgeContraction';

export {
  canContractEdge,
  contractEdge,
  contractShortEdges,
  EdgeContractor,
} from './EdgeContraction';

export type { VertexRelocationResult } from './VertexRelocation';

export {
  computeTangentialSmoothing,
  relocateVertex,
  smoothVertex,
  smoothAllVertices,
  VertexRelocator,
} from './VertexRelocation';
