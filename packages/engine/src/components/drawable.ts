import { type Engine } from '../engine';
import { Vector, type VectorConstructor } from '../math/vector';
import type { CameraSystem } from '../systems/camera';
import { type RenderCommandStream } from '../systems/render/command';
import { RENDER_STYLE_KEYS, type RenderStyle } from '../systems/render/style';
import { OPACITY_THRESHOLD } from '../utils';
import { Component, type ComponentOptions } from './index';

export interface C_DrawableOptions extends ComponentOptions, RenderStyle {
    origin?: VectorConstructor;
    size?: VectorConstructor;
    fill?: boolean;
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

    constructor(options: DrawableOptions) {
        super({ name: 'drawable', ...options });

        this._origin = new Vector(options.origin ?? 0.5);
        this._size = new Vector(options.size ?? 1);
        this._fill = options.fill ?? false;
        this._opacity = options.opacity ?? 1;

        this._style = {};
        // Only assign defined properties to save on memory
        for (const key of RENDER_STYLE_KEYS) {
            const value = options[key];
            if (value !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this._style[key] = value as any;
            }
        }
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
        return this._opacity * this._entity.opacity;
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

    public override queueRenderCommands(
        stream: RenderCommandStream,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _camera: CameraSystem,
    ): boolean {
        const opacity = this.opacity;
        if (opacity >= OPACITY_THRESHOLD) {
            stream.setOpacity(opacity);
            stream.setStyle(this._style);

            if (this._fill) {
                const parentBB = this._entity.transform.boundingBox;
                this._size.set(
                    parentBB.x2 - parentBB.x1,
                    parentBB.y2 - parentBB.y1,
                );
                if (this._entity.scaleRelativeToCamera.x) {
                    this._size.x /= this._entity.transform.scaleMult.x;
                }
                if (this._entity.scaleRelativeToCamera.y) {
                    this._size.y /= this._entity.transform.scaleMult.y;
                }
                this._origin.set(1);
            }

            return true;
        }

        return false;
    }

    protected override _computeBoundingBox(): void {
        this._boundingBox.set(
            -this._origin.x * this._size.x,
            -this._origin.y * this._size.y,
            (1 - this._origin.x) * this._size.x,
            (1 - this._origin.y) * this._size.y,
        );
    }
}
