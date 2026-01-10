import type { Vec3 } from '../geometry/GeometricUtils';

/**
 * A spatial hash grid for fast neighbor queries.
 * Uses a 3D hash grid to accelerate proximity searches.
 *
 * @template T - The type of items stored in the hash
 */
export class SpatialHash<T> {
  private cells: Map<string, T[]> = new Map();
  private cellSize: number;
  private itemPositions: Map<T, Vec3> = new Map();

  /**
   * Creates a new spatial hash with the specified cell size.
   *
   * @param cellSize - The size of each cell in the grid
   */
  constructor(cellSize: number) {
    if (cellSize <= 0) {
      throw new Error('Cell size must be positive');
    }
    this.cellSize = cellSize;
  }

  /**
   * Computes the cell key for a position.
   */
  private getCellKey(x: number, y: number, z: number): string {
    const ix = Math.floor(x / this.cellSize);
    const iy = Math.floor(y / this.cellSize);
    const iz = Math.floor(z / this.cellSize);
    return `${ix},${iy},${iz}`;
  }

  /**
   * Computes the cell indices for a position.
   */
  private getCellIndices(x: number, y: number, z: number): [number, number, number] {
    return [
      Math.floor(x / this.cellSize),
      Math.floor(y / this.cellSize),
      Math.floor(z / this.cellSize),
    ];
  }

  /**
   * Inserts an item at the specified position.
   *
   * @param item - The item to insert
   * @param position - The 3D position of the item
   */
  insert(item: T, position: Vec3): void {
    const key = this.getCellKey(position.x, position.y, position.z);

    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }

    cell.push(item);
    this.itemPositions.set(item, position);
  }

  /**
   * Removes an item from the hash.
   *
   * @param item - The item to remove
   * @returns True if the item was found and removed
   */
  remove(item: T): boolean {
    const position = this.itemPositions.get(item);
    if (!position) {
      return false;
    }

    const key = this.getCellKey(position.x, position.y, position.z);
    const cell = this.cells.get(key);

    if (cell) {
      const index = cell.indexOf(item);
      if (index !== -1) {
        cell.splice(index, 1);
        if (cell.length === 0) {
          this.cells.delete(key);
        }
      }
    }

    this.itemPositions.delete(item);
    return true;
  }

  /**
   * Updates an item's position in the hash.
   *
   * @param item - The item to update
   * @param newPosition - The new position
   */
  update(item: T, newPosition: Vec3): void {
    this.remove(item);
    this.insert(item, newPosition);
  }

  /**
   * Queries all items within a radius of a point.
   *
   * @param center - The center point of the query
   * @param radius - The search radius
   * @returns Array of items within the radius
   */
  queryRadius(center: Vec3, radius: number): T[] {
    const results: T[] = [];
    const radiusSquared = radius * radius;

    // Calculate the range of cells to check
    const minCell = this.getCellIndices(center.x - radius, center.y - radius, center.z - radius);
    const maxCell = this.getCellIndices(center.x + radius, center.y + radius, center.z + radius);

    // Check all cells in range
    for (let ix = minCell[0]; ix <= maxCell[0]; ix++) {
      for (let iy = minCell[1]; iy <= maxCell[1]; iy++) {
        for (let iz = minCell[2]; iz <= maxCell[2]; iz++) {
          const key = `${ix},${iy},${iz}`;
          const cell = this.cells.get(key);

          if (cell) {
            for (const item of cell) {
              const pos = this.itemPositions.get(item);
              if (pos) {
                const dx = pos.x - center.x;
                const dy = pos.y - center.y;
                const dz = pos.z - center.z;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq <= radiusSquared) {
                  results.push(item);
                }
              }
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Queries the k nearest neighbors to a point.
   *
   * @param center - The center point of the query
   * @param k - The number of neighbors to find
   * @param maxRadius - Optional maximum search radius
   * @returns Array of the k nearest items, sorted by distance
   */
  queryKNearest(center: Vec3, k: number, maxRadius?: number): T[] {
    // Start with a small radius and expand if needed
    let radius = this.cellSize;
    let results: Array<{ item: T; distSq: number }> = [];

    while (results.length < k) {
      if (maxRadius !== undefined && radius > maxRadius) {
        break;
      }

      results = [];
      const candidates = this.queryRadius(center, radius);

      for (const item of candidates) {
        const pos = this.itemPositions.get(item);
        if (pos) {
          const dx = pos.x - center.x;
          const dy = pos.y - center.y;
          const dz = pos.z - center.z;
          results.push({ item, distSq: dx * dx + dy * dy + dz * dz });
        }
      }

      radius *= 2;
    }

    // Sort by distance and return top k
    results.sort((a, b) => a.distSq - b.distSq);
    return results.slice(0, k).map((r) => r.item);
  }

  /**
   * Clears all items from the hash.
   */
  clear(): void {
    this.cells.clear();
    this.itemPositions.clear();
  }

  /**
   * Gets the number of items in the hash.
   */
  get size(): number {
    return this.itemPositions.size;
  }

  /**
   * Gets the number of non-empty cells.
   */
  get cellCount(): number {
    return this.cells.size;
  }

  /**
   * Gets the position of an item.
   */
  getPosition(item: T): Vec3 | undefined {
    return this.itemPositions.get(item);
  }

  /**
   * Checks if an item is in the hash.
   */
  has(item: T): boolean {
    return this.itemPositions.has(item);
  }

  /**
   * Iterates over all items in the hash.
   */
  *[Symbol.iterator](): Iterator<T> {
    for (const item of this.itemPositions.keys()) {
      yield item;
    }
  }

  /**
   * Gets all items in the hash.
   */
  getAll(): T[] {
    return Array.from(this.itemPositions.keys());
  }
}

/**
 * Creates a spatial hash from an array of items with positions.
 *
 * @param items - Array of items with position getter
 * @param getPosition - Function to get the position of an item
 * @param cellSize - Optional cell size (auto-computed if not provided)
 */
export function createSpatialHash<T>(
  items: T[],
  getPosition: (item: T) => Vec3,
  cellSize?: number
): SpatialHash<T> {
  // Auto-compute cell size based on item spread if not provided
  let computedCellSize = cellSize;

  if (computedCellSize === undefined && items.length > 1) {
    // Compute bounding box
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const item of items) {
      const pos = getPosition(item);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      minZ = Math.min(minZ, pos.z);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
      maxZ = Math.max(maxZ, pos.z);
    }

    const diagonal = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2 + (maxZ - minZ) ** 2);

    // Cell size is diagonal / sqrt(n) for roughly uniform distribution
    computedCellSize = diagonal / Math.sqrt(items.length);
  }

  const hash = new SpatialHash<T>(computedCellSize ?? 1.0);

  for (const item of items) {
    hash.insert(item, getPosition(item));
  }

  return hash;
}
