import { C_Drawable, C_DrawableOptions } from '../components/drawable';
import type { Engine } from '../engine';
import { Entity, EntityOptions } from '../entities';
import { type IVector, Vector, type VectorConstructor } from '../math/vector';
import type { RenderCommandStream } from '../systems/render/command';

const DEFAULT_ARROW_LENGTH = 1;
const DEFAULT_ARROW_ANGLE = 45;

export type Shape = 'RECT' | 'ELLIPSE' | 'LINE';

export interface ArrowTip {
    type: 'arrow';
    length?: number;
    angle?: number;
}

export type Tip = ArrowTip;

export interface C_ShapeOptions extends C_DrawableOptions {
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
    #shape: Shape;
    #repeat: Vector;
    #gap: Vector;

    #start: Vector | null = null;
    #end: Vector | null = null;

    #startTip: Tip | null = null;
    #endTip: Tip | null = null;

    constructor(options: C_ShapeOptions) {
        const {
            name = 'shape',
            shape,
            repeat,
            gap,
            start,
            end,
            startTip,
            endTip,
            ...rest
        } = options;
        super({ name, ...rest });

        this.#shape = shape;
        this.#repeat = new Vector(repeat ?? 1);
        this.#gap = new Vector(gap ?? 1);

        if (start) this.#start = new Vector(start);
        if (end) this.#end = new Vector(end);
        this.#startTip = startTip ?? null;
        this.#endTip = endTip ?? null;
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

    set repeat(repeat: VectorConstructor | null) {
        this.#repeat = new Vector(repeat ?? 1);
    }

    get gap(): Vector {
        return this.#gap;
    }

    set gap(gap: VectorConstructor | null) {
        this.#gap = new Vector(gap ?? 1);
    }

    get start(): Vector | null {
        return this.#start;
    }

    get end(): Vector | null {
        return this.#end;
    }

    setStart(start: IVector<number>): this {
        if (!this.#start) {
            this.#start = new Vector(start);
        } else {
            this.#start.set(start);
        }

        return this;
    }

    setEnd(end: IVector<number>): this {
        if (!this.#end) {
            this.#end = new Vector(end);
        } else {
            this.#end.set(end);
        }

        return this;
    }

    setPoints(start: IVector<number>, end: IVector<number>): this {
        this.setStart(start);
        this.setEnd(end);
        return this;
    }

    setStartTip(tip: Tip | null): this {
        this.#startTip = tip;
        return this;
    }

    setEndTip(tip: Tip | null): this {
        this.#endTip = tip;
        return this;
    }

    override queueRenderCommands(stream: RenderCommandStream): boolean {
        if (!super.queueRenderCommands(stream)) {
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

export interface E_ShapeOptions extends EntityOptions, C_ShapeOptions {}

export interface E_ShapeJSON extends E_ShapeOptions {
    type: 'shape';
}

export class E_Shape<TEngine extends Engine = Engine> extends Entity<TEngine> {
    #shape: C_Shape<TEngine>;

    constructor(options: E_ShapeOptions) {
        super(options);

        this.#shape = this.addComponent<C_Shape<TEngine>>({
            type: 'shape',
            ...options,
            name: 'Shape',
        });
    }

    get shape(): Shape {
        return this.#shape.shape;
    }
}
