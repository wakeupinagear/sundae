import type { Engine } from '../../engine';
import type { Entity } from '../../entities';
import { type BoundingBox } from '../../math/boundingBox';
import { type IVector } from '../../math/vector';

export interface SpatialHashGridStats {
    cellCount: number;
    entityCount: number;
    avgEntitiesPerCell: number;
    maxEntitiesInCell: number;
}

export class SpatialHashGrid<
    TEntity extends Entity<TEngine>,
    TEngine extends Engine = Engine,
> {
    #cellSize: number;
    #grid: Map<string, Set<TEntity>> = new Map();
    #entityCells: Map<string, string[]> = new Map();

    constructor(cellSize: number) {
        this.#cellSize = cellSize;
    }

    insert(entity: TEntity): void {
        const bbox = entity.transform.boundingBox;
        const cellKeys = this.#getCellKeysForBounds(bbox);

        this.#entityCells.set(entity.id, cellKeys);

        for (const key of cellKeys) {
            let cell = this.#grid.get(key);
            if (!cell) {
                cell = new Set();
                this.#grid.set(key, cell);
            }

            cell.add(entity);
        }
    }

    remove(entity: TEntity): void {
        const cellKeys = this.#entityCells.get(entity.id);
        if (!cellKeys) return;

        for (const key of cellKeys) {
            const cell = this.#grid.get(key);
            if (cell) {
                cell.delete(entity);
                if (cell.size === 0) {
                    this.#grid.delete(key);
                }
            }
        }

        this.#entityCells.delete(entity.id);
    }

    update(entity: TEntity): void {
        const oldCellKeys = this.#entityCells.get(entity.id);
        const bbox = entity.transform.boundingBox;
        const newCellKeys = this.#getCellKeysForBounds(bbox);

        if (oldCellKeys && this.#cellKeysEqual(oldCellKeys, newCellKeys)) {
            return;
        }

        this.remove(entity);
        this.insert(entity);
    }

    queryPairs(): [TEntity, TEntity][] {
        const pairs: [TEntity, TEntity][] = [];
        const checkedPairs = new Set<string>();

        for (const cell of this.#grid.values()) {
            if (cell.size < 2) continue;

            const entities = Array.from(cell);
            for (let i = 0; i < entities.length; i++) {
                const entityA = entities[i];
                const bboxA = entityA.transform.boundingBox;

                for (let j = i + 1; j < entities.length; j++) {
                    const entityB = entities[j];
                    const pairId =
                        entityA.id < entityB.id
                            ? `${entityA.id}:${entityB.id}`
                            : `${entityB.id}:${entityA.id}`;
                    if (checkedPairs.has(pairId)) continue;

                    checkedPairs.add(pairId);
                    if (bboxA.intersects(entityB.transform.boundingBox)) {
                        pairs.push([entityA, entityB]);
                    }
                }
            }
        }

        return pairs;
    }

    queryBounds(bbox: BoundingBox): TEntity[] {
        const cellKeys = this.#getCellKeysForBounds(bbox);
        const entities = new Set<TEntity>();

        for (const key of cellKeys) {
            const cell = this.#grid.get(key);
            if (cell) {
                for (const entity of cell) {
                    if (bbox.intersects(entity.transform.boundingBox)) {
                        entities.add(entity);
                    }
                }
            }
        }

        return Array.from(entities);
    }

    queryPoint(point: IVector<number>): TEntity[] {
        const key = `${Math.floor(point.x / this.#cellSize)},${Math.floor(point.y / this.#cellSize)}`;
        const cell = this.#grid.get(key);
        if (cell) {
            return Array.from(cell);
        }

        return [];
    }

    clear(): void {
        this.#grid.clear();
        this.#entityCells.clear();
    }

    getStats(): Readonly<SpatialHashGridStats> {
        let maxEntities = 0;
        let totalEntities = 0;

        for (const cell of this.#grid.values()) {
            const size = cell.size;
            totalEntities += size;
            maxEntities = Math.max(maxEntities, size);
        }

        return {
            cellCount: this.#grid.size,
            entityCount: this.#entityCells.size,
            avgEntitiesPerCell:
                this.#grid.size > 0 ? totalEntities / this.#grid.size : 0,
            maxEntitiesInCell: maxEntities,
        };
    }

    #getCellKeysForBounds(bbox: BoundingBox): string[] {
        const minCellX = Math.floor(bbox.x1 / this.#cellSize);
        const minCellY = Math.floor(bbox.y1 / this.#cellSize);
        const maxCellX = Math.floor(bbox.x2 / this.#cellSize);
        const maxCellY = Math.floor(bbox.y2 / this.#cellSize);

        const keys: string[] = [];
        for (let x = minCellX; x <= maxCellX; x++) {
            for (let y = minCellY; y <= maxCellY; y++) {
                keys.push(`${x},${y}`);
            }
        }
        return keys;
    }

    #cellKeysEqual(keys1: string[], keys2: string[]): boolean {
        if (keys1.length !== keys2.length) return false;
        const set1 = new Set(keys1);
        for (const key of keys2) {
            if (!set1.has(key)) return false;
        }
        return true;
    }
}
