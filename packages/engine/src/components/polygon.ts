import type { Engine } from '../engine';
import { BoundingBox } from '../math/boundingBox';
import { Vector, type VectorConstructor } from '../math/vector';
import type { CameraSystem } from '../systems/camera';
import type { RenderCommandStream } from '../systems/render/command';
import { C_Drawable, type C_DrawableOptions } from './drawable';

export interface C_PolygonOptions extends C_DrawableOptions {
    points: VectorConstructor[];
}

export interface C_PolygonJSON extends C_PolygonOptions {
    type: 'polygon';
}

export class C_Polygon<
    TEngine extends Engine = Engine,
> extends C_Drawable<TEngine> {
    public static typeString: string = 'C_Polygon';

    #points: Vector[];

    constructor(options: C_PolygonOptions) {
        super({ name: 'polygon', ...options });

        this.#points = options.points.map((point) => new Vector(point));
    }

    override get typeString(): string {
        return C_Polygon.typeString;
    }

    get points(): ReadonlyArray<Vector> {
        return this.#points;
    }

    setPoints(points: VectorConstructor[]): this {
        if (this.#points.length > points.length) {
            this.#points.splice(points.length);
        } else if (this.#points.length < points.length) {
            this.#points.push(...points.map((point) => new Vector(point)));
        }

        for (let i = 0; i < this.#points.length; i++) {
            this.#points[i].set(points[i]);
        }

        this._markBoundsDirty();

        return this;
    }

    protected override _computeBoundingBox(): void {
        if (this.#points.length === 0) {
            this._boundingBox.set(0);
            return;
        }

        const bbox = BoundingBox.fromPositions(this.#points);
        this._boundingBox.set(bbox);
    }

    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): boolean {
        if (!super.queueRenderCommands(stream, camera)) {
            return false;
        }

        for (let i = 0; i < this.#points.length; i++) {
            const point = this.#points[i];
            stream.drawLine(
                point.x,
                point.y,
                (this.#points[i + 1] ?? this.#points[0]).x,
                (this.#points[i + 1] ?? this.#points[0]).y,
            );
        }

        return true;
    }
}
