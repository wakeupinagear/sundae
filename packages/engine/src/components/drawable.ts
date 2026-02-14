import { type Engine } from '../engine';
import { Vector, type VectorConstructor } from '../math/vector';
import type { CameraSystem } from '../systems/camera';
import { type RenderCommandStream } from '../systems/render/command';
import { RENDER_STYLE_KEYS, type RenderStyle } from '../systems/render/style';
import { ComponentAppearance } from '../types';
import { OPACITY_THRESHOLD } from '../utils';
import type { C_ColliderOptions } from './colliders';
import { Component, type ComponentOptions } from './index';

interface DrawableStyle extends RenderStyle {
    opacity?: number;
}

export interface C_DrawableOptions
    extends ComponentOptions,
        C_ColliderOptions,
        DrawableStyle {
    origin?: VectorConstructor;
    size?: VectorConstructor;
    fill?: boolean;
    hoverStyle?: DrawableStyle;
}

interface DrawableOptions extends C_DrawableOptions, ComponentOptions {}

export abstract class C_Drawable<
    TEngine extends Engine = Engine,
> extends Component<TEngine> {
    protected _origin: Vector;
    protected _size: Vector;
    protected _style: DrawableStyle;
    protected _hoverStyle: DrawableStyle;

    protected _fill = false;

    #computedStyle: DrawableStyle = {};

    constructor(options: DrawableOptions) {
        super({ name: 'drawable', ...options });

        this._origin = new Vector(options.origin ?? 0.5);
        this._size = new Vector(options.size ?? 1);
        this.setFill(options.fill ?? this._fill);

        this._style = {};
        // Only assign defined properties to save on memory
        for (const key of RENDER_STYLE_KEYS) {
            const value = options[key];
            if (value !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this._style[key] = value as any;
            }
        }
        if (options.opacity !== undefined) {
            this._style.opacity = options.opacity;
        }

        this._hoverStyle = options.hoverStyle ?? {};
        this.#computeStyle();
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
        return this.#computedStyle;
    }

    get computedStyle(): RenderStyle {
        return this.#computedStyle;
    }

    get opacity(): number {
        return this.#computedStyle.opacity ?? 1;
    }

    override get appearance(): ComponentAppearance {
        return this._fill
            ? ComponentAppearance.BACKGROUND
            : ComponentAppearance.FOREGROUND;
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
        if (fill !== this._fill) {
            this._fill = fill;
            this._entity.componentAppearancesDirty = true;
        }

        return this;
    }

    setStyle(style: RenderStyle): this {
        this._style = { ...this._style, ...style };
        this.#computeStyle();

        return this;
    }

    setHoverStyle(style: RenderStyle): this {
        this._hoverStyle = { ...this._hoverStyle, ...style };
        this.#computeStyle();

        return this;
    }

    setOpacity(opacity: number): this {
        if (this.#computedStyle.opacity !== opacity) {
            this.#computedStyle.opacity = opacity;
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
            stream.pushOpacity(opacity);
            stream.setStyle(this.#computedStyle);

            if (this._fill) {
                const transform = this._entity.transform;
                const parentBB = transform.boundingBox;
                const w = parentBB.x2 - parentBB.x1;
                const h = parentBB.y2 - parentBB.y1;
                const sx = transform.scale.x * transform.scaleMult.x;
                const sy = transform.scale.y * transform.scaleMult.y;
                this._size.set(sx !== 0 ? w / sx : w, sy !== 0 ? h / sy : h);
                const pos = transform.worldPosition;
                this._origin.set(
                    w !== 0 ? (pos.x - parentBB.x1) / w : 1,
                    h !== 0 ? (pos.y - parentBB.y1) / h : 1,
                );
            }

            return true;
        }

        return false;
    }

    protected _onFinishQueueRenderCommands(stream: RenderCommandStream): void {
        stream.popOpacity();
    }

    override onPointerEnter(): void {
        this.#computeStyle(true);
    }

    override onPointerLeave(): void {
        this.#computeStyle(false);
    }

    protected override _computeBoundingBox(): void {
        this._boundingBox.set(
            -this._origin.x * this._size.x,
            -this._origin.y * this._size.y,
            (1 - this._origin.x) * this._size.x,
            (1 - this._origin.y) * this._size.y,
        );
    }

    #computeStyle(
        pointerHovered: boolean = this._entity.collider?.isPointerHovered ??
            false,
    ): void {
        const prevStyle = { ...this.#computedStyle };
        this.#computedStyle = pointerHovered
            ? { ...this._style, ...this._hoverStyle }
            : { ...this._style };
        if (
            Object.keys(prevStyle).some(
                (key) =>
                    prevStyle[key as keyof RenderStyle] !==
                    this.#computedStyle[key as keyof RenderStyle],
            )
        ) {
            this._engine.forceRender();
        }
    }
}
