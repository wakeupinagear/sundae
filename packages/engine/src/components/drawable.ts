import { Component, ComponentOptions } from '.';
import { Engine } from '../engine';
import { Vector, VectorConstructor } from '../math/vector';
import { RenderCommandStream } from '../systems/render/command';
import { RenderStyle } from '../systems/render/style';
import { OPACITY_THRESHOLD } from '../utils';

export interface C_DrawableOptions extends ComponentOptions {
    origin?: VectorConstructor;
    size?: VectorConstructor;
    style?: RenderStyle;
    opacity?: number;
}

interface DrawableOptions extends C_DrawableOptions, ComponentOptions {}

export abstract class C_Drawable<
    TEngine extends Engine = Engine,
> extends Component<TEngine> {
    protected _origin: Vector;
    protected _size: Vector;
    protected _style: RenderStyle;
    protected _opacity: number;

    constructor(options: DrawableOptions) {
        const { name = 'drawable', ...rest } = options;
        super({ name, ...rest });

        this._origin = new Vector(options.origin ?? 0.5);
        this._size = new Vector(options.size ?? 1);
        this._style = options.style ?? {};
        this._opacity = rest?.opacity ?? 1;
    }

    get style(): RenderStyle {
        return this._style;
    }

    setStyle(style: RenderStyle): this {
        this._style = { ...this._style, ...style };
        return this;
    }

    get origin(): Readonly<Vector> {
        return this._origin;
    }

    setOrigin(origin: VectorConstructor): this {
        if (this._origin.set(origin)) {
            this._markBoundingBoxDirty();
        }

        return this;
    }

    get size(): Readonly<Vector> {
        return this._size;
    }

    setSize(size: VectorConstructor): this {
        if (this._size.set(size)) {
            this._markBoundingBoxDirty();
        }

        return this;
    }

    get opacity(): number {
        return this._opacity;
    }

    setOpacity(opacity: number): this {
        if (this._opacity !== opacity) {
            this._opacity = opacity;
            if (this._entity) {
                this._entity.onChildComponentsOfTypeChanged(this.typeString);
            }
        }

        return this;
    }

    public override queueRenderCommands(stream: RenderCommandStream): boolean {
        if (this._opacity >= OPACITY_THRESHOLD) {
            stream.setOpacity(this._opacity);
            stream.setStyle(this._style);

            return true;
        }

        return false;
    }

    public override isVisual(): boolean {
        return true;
    }

    protected override _computeBoundingBox(): void {
        this._boundingBox = {
            x1: -this._origin.x * this._size.x,
            x2: this._origin.x * this._size.x,
            y1: -this._origin.y * this._size.y,
            y2: this._origin.y * this._size.y,
        };
    }
}
