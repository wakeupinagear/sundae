import type { IVector } from './vector';

export interface IBoundingBox {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}

export type BoundingBoxConstructor = number | IBoundingBox;

export class BoundingBox implements IBoundingBox {
    x1: number;
    x2: number;
    y1: number;
    y2: number;

    constructor(options: BoundingBoxConstructor) {
        if (typeof options === 'number') {
            this.x1 = -options;
            this.x2 = options;
            this.y1 = -options;
            this.y2 = options;
        } else {
            this.x1 = options.x1;
            this.x2 = options.x2;
            this.y1 = options.y1;
            this.y2 = options.y2;
        }
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
        if (
            typeof x1OrOther === 'number' &&
            y1 !== undefined &&
            x2 !== undefined &&
            y2 !== undefined
        ) {
            if (
                this.x1 === x1OrOther &&
                this.y1 === y1 &&
                this.x2 === x2 &&
                this.y2 === y2
            ) {
                return false;
            }

            this.x1 = x1OrOther;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;

            return true;
        }

        if (typeof x1OrOther === 'number') {
            if (
                this.x1 === -x1OrOther &&
                this.x2 === x1OrOther &&
                this.y1 === -x1OrOther &&
                this.y2 === x1OrOther
            ) {
                return false;
            }

            this.x1 = -x1OrOther;
            this.x2 = x1OrOther;
            this.y1 = -x1OrOther;
            this.y2 = x1OrOther;
        } else {
            if (
                this.x1 === x1OrOther.x1 &&
                this.x2 === x1OrOther.x2 &&
                this.y1 === x1OrOther.y1 &&
                this.y2 === x1OrOther.y2
            ) {
                return false;
            }

            this.x1 = x1OrOther.x1;
            this.x2 = x1OrOther.x2;
            this.y1 = x1OrOther.y1;
            this.y2 = x1OrOther.y2;
        }

        return true;
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
