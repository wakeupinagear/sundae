import type { Engine } from '../engine';
import { type IVector, Vector, type VectorConstructor } from '../math/vector';
import type { CameraSystem } from '../systems/camera';
import type { RenderCommandStream } from '../systems/render/command';
import { C_ShapeBase, type C_ShapeBaseOptions } from './shape';

const DEFAULT_ARROW_LENGTH = 1;
const DEFAULT_ARROW_ANGLE = 45;

export interface ArrowTip {
    type: 'arrow';
    length?: number;
    angle?: number;
}

export type Tip = ArrowTip;

export interface C_LineOptions extends C_ShapeBaseOptions {
    start?: VectorConstructor;
    end?: VectorConstructor;
    startTip?: Tip;
    endTip?: Tip;
}

export interface C_LineJSON extends C_LineOptions {
    type: 'line';
}

export class C_Line<
    TEngine extends Engine = Engine,
> extends C_ShapeBase<TEngine> {
    public static typeString: string = 'C_Line';

    #start: Vector | null = null;
    #end: Vector | null = null;
    #startTip: Tip | null = null;
    #endTip: Tip | null = null;

    constructor(options: C_LineOptions) {
        super(
            {
                name: 'line',
                lineCap: options.startTip || options.endTip ? 'round' : 'butt',
                ...options,
            },
            'line',
        );
        if (options.start) this.#start = new Vector(options.start);
        if (options.end) this.#end = new Vector(options.end);
        this.#startTip = options.startTip ?? null;
        this.#endTip = options.endTip ?? null;
    }

    override get typeString(): string {
        return C_Line.typeString;
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
            this.repeat.x,
            this.repeat.y,
            this.gap.x,
            this.gap.y,
        );

        this.#drawTip(this.#startTip, this.#start, -1, stream);
        this.#drawTip(this.#endTip, this.#end, 1, stream);

        this._onFinishQueueRenderCommands(stream);
        return true;
    }

    protected override _computeBoundingBox(): void {
        if (!this.#start || !this.#end) {
            super._computeBoundingBox();
            return;
        }
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

        this._setBoundingBox({
            x1: minX,
            x2: maxX,
            y1: minY,
            y2: maxY,
        });
    }

    #getArrowTipPoints(
        origin: IVector<number>,
        angMult: number,
        tip: Tip,
    ): IVector<number>[] {
        if (!this.#start || !this.#end) return [];
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
    ): void {
        if (!this.#start || !this.#end) return;
        if (tip?.type !== 'arrow') return;

        const { length = DEFAULT_ARROW_LENGTH } = tip;
        let { angle = DEFAULT_ARROW_ANGLE } = tip;
        angle *= angMult;
        const baseAng = Math.atan2(
            this.#end.x - this.#start.x,
            this.#end.y - this.#start.y,
        );

        stream.setStyle({
            ...this.computedStyle,
            lineCap: 'round',
            lineJoin: 'round',
        });

        stream.drawLine(
            origin.x,
            origin.y,
            origin.x + Math.cos(baseAng + (angle / 180) * Math.PI) * length,
            origin.y + -Math.sin(baseAng + (angle / 180) * Math.PI) * length,
            this.repeat.x,
            this.repeat.y,
            this.gap.x,
            this.gap.y,
        );
        stream.drawLine(
            origin.x,
            origin.y,
            origin.x + -Math.cos(baseAng + (-angle / 180) * Math.PI) * length,
            origin.y + Math.sin(baseAng + (-angle / 180) * Math.PI) * length,
            this.repeat.x,
            this.repeat.y,
            this.gap.x,
            this.gap.y,
        );
    }
}
