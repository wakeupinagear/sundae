import type { Entity } from '../../entities';
import type { Engine } from '../../engine';
import type { BoundingBox } from '../../types';
import { boundingBoxesIntersect } from '../../utils';

export class SpatialHashGrid<TEngine extends Engine = Engine> {
    #cellSize: number;
    #grid: Map<string, Set<Entity<TEngine>>> = new Map();
    #entityCells: Map<string, string[]> = new Map();

    constructor(cellSize: number) {
        this.#cellSize = cellSize;
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

    insert(entity: Entity<TEngine>): void {
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

    remove(entity: Entity<TEngine>): void {
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

    update(entity: Entity<TEngine>): void {
        const oldCellKeys = this.#entityCells.get(entity.id);
        const bbox = entity.transform.boundingBox;
        const newCellKeys = this.#getCellKeysForBounds(bbox);
        
        if (oldCellKeys && this.#cellKeysEqual(oldCellKeys, newCellKeys)) {
            return;
        }

        this.remove(entity);
        this.insert(entity);
    }

    #cellKeysEqual(keys1: string[], keys2: string[]): boolean {
        if (keys1.length !== keys2.length) return false;
        const set1 = new Set(keys1);
        for (const key of keys2) {
            if (!set1.has(key)) return false;
        }
        return true;
    }

    queryPairs(): [Entity<TEngine>, Entity<TEngine>][] {
        const pairs: [Entity<TEngine>, Entity<TEngine>][] = [];
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
                    if (boundingBoxesIntersect(bboxA, entityB.transform.boundingBox)) {
                        pairs.push([entityA, entityB]);
                    }
                }
            }
        }

        return pairs;
    }

    queryBounds(bbox: BoundingBox): Entity<TEngine>[] {
        const cellKeys = this.#getCellKeysForBounds(bbox);
        const entities = new Set<Entity<TEngine>>();

        for (const key of cellKeys) {
            const cell = this.#grid.get(key);
            if (cell) {
                for (const entity of cell) {
                    if (boundingBoxesIntersect(bbox, entity.transform.boundingBox)) {
                        entities.add(entity);
                    }
                }
            }
        }

        return Array.from(entities);
    }

    clear(): void {
        this.#grid.clear();
        this.#entityCells.clear();
    }

    getStats(): {
        cellCount: number;
        entityCount: number;
        avgEntitiesPerCell: number;
        maxEntitiesInCell: number;
    } {
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
            avgEntitiesPerCell: this.#grid.size > 0 ? totalEntities / this.#grid.size : 0,
            maxEntitiesInCell: maxEntities,
        };
    }
}
