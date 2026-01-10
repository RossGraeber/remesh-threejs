/**
 * Geometric utilities for remesh-threejs.
 */

export type { Vec3 } from './GeometricUtils';

export {
  distanceSquared,
  distance,
  dot,
  cross,
  length,
  lengthSquared,
  normalize,
  add,
  subtract,
  scale,
  lerp,
  midpoint,
  angleBetween,
  projectPointOnLine,
  projectPointOnSegment,
  triangleArea,
  triangleNormal,
  triangleCentroid,
  triangleCircumcenter,
  triangleCircumradius,
  triangleInradius,
  triangleQuality,
  isPointInTriangle,
  barycentricCoordinates,
  isQuadConvex,
  fromVector3,
  cotangent,
  angleAtVertex,
} from './GeometricUtils';
