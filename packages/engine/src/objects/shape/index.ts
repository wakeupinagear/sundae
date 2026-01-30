import { C_Collider, type C_ColliderOptions } from '../../components/colliders';
import { type C_CircleCollider } from '../../components/colliders/CircleCollider';
import { type C_RectangleCollider } from '../../components/colliders/RectangleCollider';
import { C_Drawable, type C_DrawableOptions } from '../../components/drawable';
import type { Engine } from '../../engine';
import { Entity, type EntityOptions } from '../../entities';
import {
    type IVector,
    Vector,
    type VectorConstructor,
} from '../../math/vector';
import type { CameraSystem } from '../../systems/camera';
import type { RenderCommandStream } from '../../systems/render/command';

const DEFAULT_ARROW_LENGTH = 1;
const DEFAULT_ARROW_ANGLE = 45;

export type Shape = 'RECT' | 'ELLIPSE' | 'LINE';

export interface ArrowTip {
    type: 'arrow';
    length?: number;
    angle?: number;
}

export type Tip = ArrowTip;

export interface C_ShapeOptions extends C_DrawableOptions, C_ColliderOptions {
    shape: Shape;
    repeat?: VectorConstructor;
    gap?: VectorConstructor;
    start?: VectorConstructor;
    end?: VectorConstructor;
    startTip?: Tip;
    endTip?: Tip;
}

export interface C_ShapeJSON extends C_ShapeOptions {
    type: 'shape';
}

export class C_Shape<
    TEngine extends Engine = Engine,
> extends C_Drawable<TEngine> {
    public static typeString: string = 'C_Shape';

    #shape: Shape;
    #repeat: Vector;
    #gap: Vector;

    #start: Vector | null = null;
    #end: Vector | null = null;

    #startTip: Tip | null = null;
    #endTip: Tip | null = null;

    constructor(options: C_ShapeOptions) {
        super({
            name: 'shape',
            lineCap: options.startTip || options.endTip ? 'round' : 'butt',
            ...options,
        });

        this.#shape = options.shape;
        this.#repeat = new Vector(options.repeat ?? 1);
        this.#gap = new Vector(options.gap ?? 1);

        if (options.start) this.#start = new Vector(options.start);
        if (options.end) this.#end = new Vector(options.end);
        this.#startTip = options.startTip ?? null;
        this.#endTip = options.endTip ?? null;
    }

    override get typeString(): string {
        return C_Shape.typeString;
    }

    get shape(): Shape {
        return this.#shape;
    }

    set shape(shape: Shape) {
        this.#shape = shape;
    }

    get repeat(): Vector {
        return this.#repeat;
    }

    get gap(): Vector {
        return this.#gap;
    }

    get start(): Vector | null {
        return this.#start;
    }

    setRepeat(repeat: VectorConstructor): this {
        this.#repeat.set(repeat);
        return this;
    }

    setGap(gap: VectorConstructor): this {
        this.#gap.set(gap);
        return this;
    }

    setStart(start: IVector<number>): this {
        if (!this.#start) {
            this.#start = new Vector(start);
        } else {
            this.#start.set(start);
        }

        this._markBoundsDirty();
        return this;
    }

    setEnd(end: IVector<number>): this {
        if (!this.#end) {
            this.#end = new Vector(end);
        } else {
            this.#end.set(end);
        }

        this._markBoundsDirty();
        return this;
    }

    setPoints(start: IVector<number>, end: IVector<number>): this {
        this.setStart(start);
        this.setEnd(end);
        return this;
    }

    setStartTip(tip: Tip | null): this {
        this.#startTip = tip;
        this._markBoundsDirty();
        return this;
    }

    setEndTip(tip: Tip | null): this {
        this.#endTip = tip;
        this._markBoundsDirty();
        return this;
    }

    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): boolean {
        if (!super.queueRenderCommands(stream, camera)) {
            return false;
        }

        switch (this.#shape) {
            case 'LINE': {
                if (!this.#start || !this.#end) {
                    return false;
                }
                if (this.#start.equals(this.#end)) {
                    return false;
                }

                stream.drawLine(
                    this.#start.x,
                    this.#start.y,
                    this.#end.x,
                    this.#end.y,
                    this.#repeat.x,
                    this.#repeat.y,
                    this.#gap.x,
                    this.#gap.y,
                );

                this.#drawTip(this.#startTip, this.#start, -1, stream);
                this.#drawTip(this.#endTip, this.#end, 1, stream);

                break;
            }
            case 'RECT': {
                stream.drawRect(
                    (-1 - (this._size.x - 1)) * this._origin.x,
                    (-1 - (this._size.y - 1)) * this._origin.y,
                    this._size.x,
                    this._size.y,
                    this.#repeat?.x,
                    this.#repeat?.y,
                    this.#gap?.x,
                    this.#gap?.y,
                );

                break;
            }
            case 'ELLIPSE': {
                const centerX =
                    (-1 - (this._size.x - 1)) * this._origin.x +
                    this._size.x / 2;
                const centerY =
                    (-1 - (this._size.y - 1)) * this._origin.y +
                    this._size.y / 2;
                const x1 = centerX;
                const y1 = centerY;
                const x2 = centerX + this._size.x;
                const y2 = centerY + this._size.y;
                stream.drawEllipse(
                    x1,
                    y1,
                    x2,
                    y2,
                    this.#repeat?.x,
                    this.#repeat?.y,
                    this.#gap?.x,
                    this.#gap?.y,
                );

                break;
            }
        }

        return true;
    }

    protected override _computeBoundingBox(): void {
        if (this.#shape === 'LINE' && this.#start && this.#end) {
            let minX = Math.min(this.#start.x, this.#end.x);
            let maxX = Math.max(this.#start.x, this.#end.x);
            let minY = Math.min(this.#start.y, this.#end.y);
            let maxY = Math.max(this.#start.y, this.#end.y);

            if (this.#startTip?.type === 'arrow') {
                const tipPoints = this.#getArrowTipPoints(
                    this.#start,
                    -1,
                    this.#startTip,
                );
                for (const point of tipPoints) {
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                }
            }

            if (this.#endTip?.type === 'arrow') {
                const tipPoints = this.#getArrowTipPoints(
                    this.#end,
                    1,
                    this.#endTip,
                );
                for (const point of tipPoints) {
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                }
            }

            const lineWidth = (this._style.lineWidth ?? 1) / 2;
            this._boundingBox.set({
                x1: minX - lineWidth,
                x2: maxX + lineWidth,
                y1: minY - lineWidth,
                y2: maxY + lineWidth,
            });
        } else {
            super._computeBoundingBox();
        }
    }

    #getArrowTipPoints(
        origin: IVector<number>,
        angMult: number,
        tip: Tip,
    ): IVector<number>[] {
        if (!this.#start || !this.#end) {
            return [];
        }

        const { length = DEFAULT_ARROW_LENGTH } = tip;
        let { angle = DEFAULT_ARROW_ANGLE } = tip;
        angle *= angMult;
        const baseAng = Math.atan2(
            this.#end.x - this.#start.x,
            this.#end.y - this.#start.y,
        );

        return [
            {
                x:
                    origin.x +
                    Math.cos(baseAng + (angle / 180) * Math.PI) * length,
                y:
                    origin.y +
                    -Math.sin(baseAng + (angle / 180) * Math.PI) * length,
            },
            {
                x:
                    origin.x +
                    -Math.cos(baseAng + (-angle / 180) * Math.PI) * length,
                y:
                    origin.y +
                    Math.sin(baseAng + (-angle / 180) * Math.PI) * length,
            },
        ];
    }

    #drawTip(
        tip: Tip | null,
        origin: IVector<number>,
        angMult: number,
        stream: RenderCommandStream,
    ) {
        if (!this.#start || !this.#end) {
            return;
        }

        if (tip?.type === 'arrow') {
            const { length = DEFAULT_ARROW_LENGTH } = tip;
            let { angle = DEFAULT_ARROW_ANGLE } = tip;
            angle *= angMult;
            const baseAng = Math.atan2(
                this.#end.x - this.#start.x,
                this.#end.y - this.#start.y,
            );

            stream.setStyle({
                ...this.style,
                lineCap: 'round',
                lineJoin: 'round',
            });

            stream.drawLine(
                origin.x,
                origin.y,
                origin.x + Math.cos(baseAng + (angle / 180) * Math.PI) * length,
                origin.y +
                    -Math.sin(baseAng + (angle / 180) * Math.PI) * length,
                this.#repeat?.x,
                this.#repeat?.y,
                this.#gap?.x,
                this.#gap?.y,
            );
            stream.drawLine(
                origin.x,
                origin.y,
                origin.x +
                    -Math.cos(baseAng + (-angle / 180) * Math.PI) * length,
                origin.y +
                    Math.sin(baseAng + (-angle / 180) * Math.PI) * length,
                this.#repeat?.x,
                this.#repeat?.y,
                this.#gap?.x,
                this.#gap?.y,
            );
        }
    }
}

export interface E_ShapeOptions extends EntityOptions, C_ShapeOptions {
    collision?: boolean;
    mass?: number;
    kinematic?: boolean;
    velocity?: VectorConstructor;
    force?: VectorConstructor;
    gravityScale?: VectorConstructor;
    bounce?: number;
}

export interface E_ShapeJSON extends E_ShapeOptions {
    type: 'shape';
}

export class E_Shape<TEngine extends Engine = Engine> extends Entity<TEngine> {
    #shape: C_Shape<TEngine>;

    constructor(options: E_ShapeOptions) {
        super(options);

        this.#shape = this.addComponent<C_Shape<TEngine>>({
            ...options,
            type: 'shape',
            name: 'Shape',
        });

        if (C_Collider.isCollisionEnabledInOptions(options)) {
            const collOptions =
                C_Collider.getCollisionOptionsForEntity(options);
            if (options.shape === 'RECT') {
                this.setCollider<C_RectangleCollider<TEngine>>({
                    type: 'rectangleCollider',
                    ...collOptions,
                });
            } else if (options.shape === 'ELLIPSE') {
                this.setCollider<C_CircleCollider<TEngine>>({
                    type: 'circleCollider',
                    ...collOptions,
                });
            } else {
                this._engine.warn(
                    `Collision not supported for shape '${this.shape}'`,
                );
            }
        }
    }

    get shape(): C_Shape<TEngine> {
        return this.#shape;
    }
}
