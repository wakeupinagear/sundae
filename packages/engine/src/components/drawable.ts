import { Component, ComponentOptions } from '.';
import { Engine } from '../engine';
import { Vector, VectorConstructor } from '../math/vector';
import { RenderCommandStream } from '../systems/render/command';
import { RenderStyle } from '../systems/render/style';
import { BoundingBox } from '../types';
import { OPACITY_THRESHOLD } from '../utils';

export interface C_DrawableOptions extends ComponentOptions {
    origin?: VectorConstructor;
    size?: VectorConstructor;
    fill?: boolean;
    style?: RenderStyle;
    opacity?: number;
}

interface DrawableOptions extends C_DrawableOptions, ComponentOptions {}

export abstract class C_Drawable<
    TEngine extends Engine = Engine,
> extends Component<TEngine> {
    protected _origin: Vector;
    protected _size: Vector;
    protected _fill: boolean;
    protected _style: RenderStyle;
    protected _opacity: number;

    #fillBB: BoundingBox | null = null;

    constructor(options: DrawableOptions) {
        super({ name: 'drawable', ...options });

        this._origin = new Vector(options.origin ?? 0.5);
        this._size = new Vector(options.size ?? 1);
        this._fill = options.fill ?? false;
        this._style = options.style ?? {};
        this._opacity = options.opacity ?? 1;
    }

    get origin(): Readonly<Vector> {
        return this._origin;
    }

    get size(): Readonly<Vector> {
        return this._size;
    }

    get fill(): boolean {
        return this._fill;
    }

    get style(): RenderStyle {
        return this._style;
    }

    get opacity(): number {
        return this._opacity;
    }

    override isVisual(): boolean {
        return !this._fill;
    }

    setOrigin(origin: VectorConstructor): this {
        if (this._origin.set(origin)) {
            this._markBoundsDirty();
        }

        return this;
    }

    setSize(size: VectorConstructor): this {
        if (this._size.set(size)) {
            this._markBoundsDirty();
        }

        return this;
    }

    setFill(fill: boolean): this {
        this._fill = fill;

        return this;
    }

    setStyle(style: RenderStyle): this {
        this._style = { ...this._style, ...style };
        return this;
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

            if (this._fill) {
                if (!this.#fillBB) {
                    this.#fillBB = {
                        x1: 0,
                        x2: 0,
                        y1: 0,
                        y2: 0,
                    };
                } else {
                    this.#fillBB.x1 = 0;
                    this.#fillBB.x2 = 0;
                    this.#fillBB.y1 = 0;
                    this.#fillBB.y2 = 0;
                }

                for (const comp of this._entity.components) {
                    if (comp.id !== this.id && comp.isVisual()) {
                        this.#fillBB.x1 = Math.min(this.#fillBB.x1, comp.boundingBox.x1);
                        this.#fillBB.x2 = Math.max(this.#fillBB.x2, comp.boundingBox.x2);
                        this.#fillBB.y1 = Math.min(this.#fillBB.y1, comp.boundingBox.y1);
                        this.#fillBB.y2 = Math.max(this.#fillBB.y2, comp.boundingBox.y2);
                    }
                }

                this._size.set({ x: this.#fillBB.x2 - this.#fillBB.x1, y: this.#fillBB.y2 - this.#fillBB.y1 });
                this._origin.set(1);
            }

            return true;
        }

        return false;
    }

    protected override _computeBoundingBox(): void {
        this._boundingBox = {
            x1: -this._origin.x * this._size.x,
            x2: (1 - this._origin.x) * this._size.x,
            y1: -this._origin.y * this._size.y,
            y2: (1 - this._origin.y) * this._size.y,
        };
    }
}
