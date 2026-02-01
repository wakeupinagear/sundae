import type { IVector, VectorConstructor } from './vector';

export interface IBoundingBox {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}

export type BoundingBoxConstructor = VectorConstructor | IBoundingBox;

export class BoundingBox implements IBoundingBox {
    x1!: number;
    x2!: number;
    y1!: number;
    y2!: number;

    constructor(other: BoundingBoxConstructor) {
        this.set(other);
    }

    static fromTransformProperties(
        position: IVector<number>,
        size: IVector<number>,
        rotation: number,
        origin: IVector<number> = { x: 0, y: 0 },
    ): BoundingBox {
        // Convert rotation from degrees to radians
        const theta = (rotation * Math.PI) / 180;

        // Rectangle corners relative to the origin
        const corners = [
            { x: -origin.x, y: -origin.y }, // Top-left
            { x: size.x - origin.x, y: -origin.y }, // Top-right
            { x: size.x - origin.x, y: size.y - origin.y }, // Bottom-right
            { x: -origin.x, y: size.y - origin.y }, // Bottom-left
        ];

        // Rotate and translate corners
        const rotated = corners.map((pt) => {
            const xRot = pt.x * Math.cos(theta) - pt.y * Math.sin(theta);
            const yRot = pt.x * Math.sin(theta) + pt.y * Math.cos(theta);
            return {
                x: xRot + position.x,
                y: yRot + position.y,
            };
        });

        // Calculate min/max x and y
        const bbox = new BoundingBox({
            x1: rotated[0].x,
            x2: rotated[0].x,
            y1: rotated[0].y,
            y2: rotated[0].y,
        });
        for (let i = 1; i < rotated.length; i++) {
            const { x, y } = rotated[i];
            if (x < bbox.x1) bbox.x1 = x;
            if (x > bbox.x2) bbox.x2 = x;
            if (y < bbox.y1) bbox.y1 = y;
            if (y > bbox.y2) bbox.y2 = y;
        }

        return bbox;
    }

    static fromPositions(positions: IVector<number>[]): BoundingBox {
        const bbox = new BoundingBox(0);
        if (positions.length === 0) {
            return bbox;
        }

        bbox.x1 = positions[0].x;
        bbox.x2 = positions[0].x;
        bbox.y1 = positions[0].y;
        bbox.y2 = positions[0].y;

        for (let i = 1; i < positions.length; i++) {
            const pos = positions[i];
            if (pos.x < bbox.x1) bbox.x1 = pos.x;
            if (pos.x > bbox.x2) bbox.x2 = pos.x;
            if (pos.y < bbox.y1) bbox.y1 = pos.y;
            if (pos.y > bbox.y2) bbox.y2 = pos.y;
        }

        return bbox;
    }

    set(other: BoundingBoxConstructor): boolean;
    set(x1: number, y1: number, x2: number, y2: number): boolean;
    set(
        x1OrOther: BoundingBoxConstructor,
        y1?: number,
        x2?: number,
        y2?: number,
    ): boolean {
        let newX1 = 0,
            newY1 = 0,
            newX2 = 0,
            newY2 = 0;
        if (
            typeof x1OrOther === 'number' &&
            y1 !== undefined &&
            x2 !== undefined &&
            y2 !== undefined
        ) {
            newX1 = x1OrOther;
            newY1 = y1;
            newX2 = x2;
            newY2 = y2;
        } else if (typeof x1OrOther === 'number') {
            newX1 = x1OrOther;
            newY1 = x1OrOther;
            newX2 = x1OrOther;
            newY2 = x1OrOther;
        } else if ('x' in x1OrOther) {
            newX2 = x1OrOther.x;
            newY1 = x1OrOther.y;
            newX2 = x1OrOther.x;
            newY2 = x1OrOther.y;
        } else {
            newX1 = x1OrOther.x1;
            newY1 = x1OrOther.y1;
            newX2 = x1OrOther.x2;
            newY2 = x1OrOther.y2;
        }

        if (
            newX1 !== this.x1 ||
            newY1 !== this.y1 ||
            newX2 !== this.x2 ||
            newY2 !== this.y2
        ) {
            this.x1 = newX1;
            this.y1 = newY1;
            this.x2 = newX2;
            this.y2 = newY2;

            return true;
        }

        return false;
    }

    intersects(other: BoundingBox): boolean {
        return (
            this.x1 <= other.x2 &&
            this.x2 >= other.x1 &&
            this.y1 <= other.y2 &&
            this.y2 >= other.y1
        );
    }

    contains(position: IVector<number>): boolean {
        return (
            position.x >= this.x1 &&
            position.x <= this.x2 &&
            position.y >= this.y1 &&
            position.y <= this.y2
        );
    }
}
