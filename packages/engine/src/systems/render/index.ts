import { DynamicNumberArray } from '../../dynamicNumberArray';
import { type Engine } from '../../engine';
import { type Entity } from '../../entities';
import { HashFactory } from '../../hashFactory';
import { ItemCache } from '../../itemCache';
import { Matrix2D } from '../../math/matrix';
import type { ICanvasRenderingContext2D } from '../../types';
import { zoomToScale } from '../../utils';
import type { CameraSystem } from '../camera';
import type { LoadedImage } from '../image';
import { System } from '../index';
import {
    type RenderCommandStats,
    RenderCommandStream,
    RenderCommandType,
} from './command';
import {
    DEFAULT_RENDER_STYLE,
    type RenderStyle,
    TRANSPARENT_STYLE_COLOR,
} from './style';

interface CanvasStyle extends RenderStyle {
    globalAlpha?: number;
}

export class RenderSystem<
    TEngine extends Engine = Engine,
> extends System<TEngine> {
    public static typeString: string = 'RenderSystem';

    #stream: RenderCommandStream | null = null;
    #cameraTransform: Matrix2D = new Matrix2D();

    #hashedMaterials: HashFactory<RenderStyle> = new HashFactory<RenderStyle>(
        (style: RenderStyle) => {
            return `${style.color ?? DEFAULT_RENDER_STYLE.color}|${
                style.lineColor ?? DEFAULT_RENDER_STYLE.lineColor
            }|${style.lineWidth ?? DEFAULT_RENDER_STYLE.lineWidth}|${
                style.lineJoin ?? DEFAULT_RENDER_STYLE.lineJoin
            }|${style.lineCap ?? DEFAULT_RENDER_STYLE.lineCap}|${
                style.imageSmoothingEnabled ??
                DEFAULT_RENDER_STYLE.imageSmoothingEnabled
            }|${style.font ?? DEFAULT_RENDER_STYLE.font}|${
                style.textBaseline ?? DEFAULT_RENDER_STYLE.textBaseline
            }`;
        },
    );
    #hashedImages: HashFactory<string> = new HashFactory<string>(
        (image: string) => image,
    );
    #hashedTexts: HashFactory<string> = new HashFactory<string>(
        (text: string) => text,
    );

    #imageCache = new ItemCache<Readonly<LoadedImage>, number>(
        (imageID: number) => {
            const id = this.#hashedImages.idToItem(imageID);
            if (id === null) {
                return null;
            }

            return this._engine.getImage(id.value);
        },
    );

    #canvasStateCache: CanvasStyle = {};
    #transformScaleStack: number[] = [];
    #transformInverseStack = new DynamicNumberArray(Float32Array, 256 * 6);

    override get typeString(): string {
        return RenderSystem.typeString;
    }

    destroy(): void {}

    getStats(): Readonly<RenderCommandStats> | null {
        return this.#stream?.stats ?? null;
    }

    render(
        ctx: ICanvasRenderingContext2D,
        rootEntity: Readonly<Entity<TEngine>>,
        camera: CameraSystem,
    ) {
        if (!this.#stream) {
            this.#stream = new RenderCommandStream(
                this.#hashedMaterials,
                this.#hashedImages,
                this.#hashedTexts,
            );
        } else {
            this.#stream.clear();
        }

        const cameraTransform = this.#cameraTransform;
        cameraTransform.identity();
        cameraTransform
            .translateSelf(-camera.position.x, -camera.position.y)
            .rotateSelf(camera.rotation)
            .scaleSelf(zoomToScale(camera.zoom));

        this.#stream.pushTransform(cameraTransform);

        this._engine.trace(`queueCommands`, () => {
            rootEntity.queueRenderCommands(this.#stream!, camera);
        });

        this._engine.trace(
            `renderCommands(${this.#stream.commandCount})`,
            () => {
                this.#renderCommands(ctx);
            },
        );
    }

    #renderCommands(ctx: ICanvasRenderingContext2D) {
        let opacity = 1;
        const activeStyle = { ...DEFAULT_RENDER_STYLE };
        this.#transformScaleStack = [1];
        this.#transformInverseStack.clear();
        this.#applyStyle(ctx, {
            ...activeStyle,
            globalAlpha: opacity,
        });

        let dataPointer = 0;
        const data = this.#stream!.data;
        const commands = this.#stream!.commands;
        const commandCount = this.#stream!.commandCount;
        for (let i = 0; i < commandCount; i++) {
            const commandType = commands[i] as RenderCommandType;
            switch (commandType) {
                case RenderCommandType.PUSH_TRANSFORM: {
                    const a = data[dataPointer++];
                    const b = data[dataPointer++];
                    const c = data[dataPointer++];
                    const d = data[dataPointer++];
                    const e = data[dataPointer++];
                    const f = data[dataPointer++];
                    ctx.transform(a, b, c, d, e, f);

                    // Calculate and store inverse transform for later
                    const det = a * d - b * c;
                    if (det !== 0) {
                        const invDet = 1 / det;
                        this.#transformInverseStack.pushMultiple(
                            d * invDet, // a'
                            -b * invDet, // b'
                            -c * invDet, // c'
                            a * invDet, // d'
                            (c * f - d * e) * invDet, // e'
                            (b * e - a * f) * invDet, // f'
                        );
                    } else {
                        this.#transformInverseStack.pushMultiple(
                            1,
                            0,
                            0,
                            1,
                            0,
                            0,
                        );
                    }

                    const scaleX = Math.hypot(a, b);
                    const scaleY = Math.hypot(c, d);
                    const maxScale = Math.max(scaleX || 1, scaleY || 1) || 1;
                    this.#transformScaleStack.push(maxScale);

                    break;
                }
                case RenderCommandType.POP_TRANSFORM: {
                    if (this.#transformInverseStack.length >= 6) {
                        const buffer = this.#transformInverseStack.buffer;
                        const offset = this.#transformInverseStack.length - 6;
                        ctx.transform(
                            buffer[offset],
                            buffer[offset + 1],
                            buffer[offset + 2],
                            buffer[offset + 3],
                            buffer[offset + 4],
                            buffer[offset + 5],
                        );
                        this.#transformInverseStack.pop(6);
                    }
                    this.#transformScaleStack.pop();

                    break;
                }
                case RenderCommandType.SET_MATERIAL: {
                    const styleID = data[dataPointer++];
                    const style = this.#hashedMaterials.idToItem(styleID);
                    if (style) {
                        activeStyle.color =
                            style.value.color ?? DEFAULT_RENDER_STYLE.color;
                        activeStyle.lineColor =
                            style.value.lineColor ??
                            DEFAULT_RENDER_STYLE.lineColor;
                        activeStyle.lineWidth =
                            style.value.lineWidth ??
                            DEFAULT_RENDER_STYLE.lineWidth;
                        activeStyle.lineJoin =
                            style.value.lineJoin ??
                            DEFAULT_RENDER_STYLE.lineJoin;
                        activeStyle.lineCap =
                            style.value.lineCap ?? DEFAULT_RENDER_STYLE.lineCap;
                        activeStyle.imageSmoothingEnabled =
                            style.value.imageSmoothingEnabled ??
                            DEFAULT_RENDER_STYLE.imageSmoothingEnabled;
                        activeStyle.font =
                            style.value.font ?? DEFAULT_RENDER_STYLE.font;
                        activeStyle.textBaseline =
                            style.value.textBaseline ??
                            DEFAULT_RENDER_STYLE.textBaseline;
                        this.#applyStyle(ctx, activeStyle);
                    }

                    break;
                }
                case RenderCommandType.SET_OPACITY: {
                    opacity = data[dataPointer++];
                    ctx.globalAlpha = opacity;

                    break;
                }
                case RenderCommandType.DRAW_TEXT: {
                    const x = data[dataPointer++];
                    const y = data[dataPointer++];
                    const textID = data[dataPointer++];
                    const text = this.#hashedTexts.idToItem(textID);
                    if (text) {
                        this.#drawText(text.value, x, y, ctx, activeStyle);
                    }
                    break;
                }
                default: {
                    const x = data[dataPointer++];
                    const y = data[dataPointer++];
                    const w = data[dataPointer++];
                    const h = data[dataPointer++];
                    const rx = data[dataPointer++];
                    const ry = data[dataPointer++];
                    const gx = data[dataPointer++];
                    const gy = data[dataPointer++];

                    switch (commandType) {
                        case RenderCommandType.DRAW_RECT:
                            this.#drawRect(
                                x,
                                y,
                                w,
                                h,
                                rx,
                                ry,
                                gx,
                                gy,
                                ctx,
                                activeStyle,
                            );
                            break;
                        case RenderCommandType.DRAW_ELLIPSE:
                            this.#drawEllipse(
                                x,
                                y,
                                w,
                                h,
                                rx,
                                ry,
                                gx,
                                gy,
                                ctx,
                                activeStyle,
                            );
                            break;
                        case RenderCommandType.DRAW_LINE:
                            this.#drawLine(x, y, w, h, rx, ry, gx, gy, ctx);
                            break;
                        case RenderCommandType.DRAW_IMAGE:
                            this.#drawImage(
                                x,
                                y,
                                w,
                                h,
                                data[dataPointer++],
                                ctx,
                            );
                            break;
                        default:
                            break;
                    }

                    break;
                }
            }
        }
    }

    #applyStyle = (ctx: ICanvasRenderingContext2D, style: CanvasStyle) => {
        // Faster than checking on the canvas context itself
        const canvasStateCache = this.#canvasStateCache;
        if (
            style.color !== undefined &&
            canvasStateCache.color !== style.color
        ) {
            ctx.fillStyle = style.color;
            canvasStateCache.color = style.color;
        }
        if (
            style.lineColor !== undefined &&
            canvasStateCache.lineColor !== style.lineColor
        ) {
            ctx.strokeStyle = style.lineColor;
            canvasStateCache.lineColor = style.lineColor;
        }
        if (
            style.lineWidth !== undefined &&
            canvasStateCache.lineWidth !== style.lineWidth
        ) {
            ctx.lineWidth = style.lineWidth;
            canvasStateCache.lineWidth = style.lineWidth;
        }
        if (
            style.lineJoin !== undefined &&
            canvasStateCache.lineJoin !== style.lineJoin
        ) {
            ctx.lineJoin = style.lineJoin;
            canvasStateCache.lineJoin = style.lineJoin;
        }
        if (
            style.lineCap !== undefined &&
            canvasStateCache.lineCap !== style.lineCap
        ) {
            ctx.lineCap = style.lineCap;
            canvasStateCache.lineCap = style.lineCap;
        }
        if (
            style.imageSmoothingEnabled !== undefined &&
            canvasStateCache.imageSmoothingEnabled !==
                style.imageSmoothingEnabled
        ) {
            ctx.imageSmoothingEnabled = style.imageSmoothingEnabled;
            canvasStateCache.imageSmoothingEnabled =
                style.imageSmoothingEnabled;
        }
        if (style.font !== undefined && canvasStateCache.font !== style.font) {
            ctx.font = style.font;
            canvasStateCache.font = style.font;
        }
        if (
            style.textBaseline !== undefined &&
            canvasStateCache.textBaseline !== style.textBaseline
        ) {
            ctx.textBaseline = style.textBaseline;
            canvasStateCache.textBaseline = style.textBaseline;
        }
        if (
            style.globalAlpha !== undefined &&
            canvasStateCache.globalAlpha !== style.globalAlpha
        ) {
            ctx.globalAlpha = style.globalAlpha;
            canvasStateCache.globalAlpha = style.globalAlpha;
        }
    };

    #drawRect(
        x: number,
        y: number,
        w: number,
        h: number,
        rx: number,
        ry: number,
        gx: number,
        gy: number,
        ctx: ICanvasRenderingContext2D,
        activeStyle: RenderStyle,
    ) {
        // Fill first so stroke remains visible on top
        if (
            activeStyle.color &&
            activeStyle.color !== TRANSPARENT_STYLE_COLOR
        ) {
            for (let i = 0; i < rx; i++) {
                for (let j = 0; j < ry; j++) {
                    ctx.fillRect(x + i * gx, y + j * gy, w, h);
                }
            }
        }

        // Draw strokes without scaling line width with transform
        if (
            activeStyle.lineColor &&
            activeStyle.lineColor !== TRANSPARENT_STYLE_COLOR &&
            activeStyle.lineWidth &&
            activeStyle.lineWidth > 0
        ) {
            const currentScale =
                this.#transformScaleStack[this.#transformScaleStack.length - 1];
            const adjusted = activeStyle.lineWidth / currentScale;
            const prevWidth = ctx.lineWidth;
            ctx.lineWidth = adjusted > 0 ? adjusted : 1;

            for (let i = 0; i < rx; i++) {
                for (let j = 0; j < ry; j++) {
                    ctx.strokeRect(x + i * gx, y + j * gy, w, h);
                }
            }

            ctx.lineWidth = prevWidth;
        }
    }

    #drawEllipse(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        rx: number,
        ry: number,
        gx: number,
        gy: number,
        ctx: ICanvasRenderingContext2D,
        activeStyle: RenderStyle,
    ) {
        const currentScale =
            this.#transformScaleStack[this.#transformScaleStack.length - 1];
        const radiusX = (x2 - x1) / 2;
        const radiusY = (y2 - y1) / 2;
        const shouldFill =
            activeStyle.color && activeStyle.color !== TRANSPARENT_STYLE_COLOR;
        const shouldStroke =
            activeStyle.lineColor &&
            activeStyle.lineColor !== TRANSPARENT_STYLE_COLOR;

        let prevWidth = 1;
        if (shouldStroke) {
            let adjustedWidth = 1;
            const lineWidth =
                activeStyle.lineWidth && activeStyle.lineWidth > 0
                    ? activeStyle.lineWidth
                    : 1;
            adjustedWidth = lineWidth / currentScale;
            adjustedWidth = adjustedWidth > 0 ? adjustedWidth : 1;
            prevWidth = ctx.lineWidth;
            ctx.lineWidth = adjustedWidth;
        }

        for (let i = 0; i < rx; i++) {
            for (let j = 0; j < ry; j++) {
                ctx.beginPath();
                ctx.ellipse(
                    x1 + i * gx,
                    y1 + j * gy,
                    radiusX,
                    radiusY,
                    0,
                    0,
                    2 * Math.PI,
                );
                if (shouldFill) {
                    ctx.fill();
                }
                if (shouldStroke) {
                    ctx.stroke();
                }
                ctx.closePath();
            }
        }

        if (shouldStroke) {
            ctx.lineWidth = prevWidth;
        }
    }

    #drawLine(
        x: number,
        y: number,
        w: number,
        h: number,
        rx: number,
        ry: number,
        gx: number,
        gy: number,
        ctx: ICanvasRenderingContext2D,
    ) {
        ctx.beginPath();
        for (let i = 0; i < rx; i++) {
            for (let j = 0; j < ry; j++) {
                ctx.moveTo(x + i * gx, y + j * gy);
                ctx.lineTo(w + i * gx, h + j * gy);
            }
        }
        ctx.stroke();
        ctx.closePath();
    }

    #drawImage(
        x: number,
        y: number,
        w: number,
        h: number,
        imageID: number,
        ctx: ICanvasRenderingContext2D,
    ) {
        const image = this.#imageCache.get(imageID);
        if (!image) {
            return;
        }

        ctx.drawImage(image.image, x, y, w, h);
    }

    #drawText(
        text: string,
        x: number,
        y: number,
        ctx: ICanvasRenderingContext2D,
        activeStyle: RenderStyle,
    ) {
        if (
            activeStyle.color &&
            activeStyle.color !== TRANSPARENT_STYLE_COLOR
        ) {
            ctx.fillText(text, x, y);
        }

        if (
            activeStyle.lineColor &&
            activeStyle.lineColor !== TRANSPARENT_STYLE_COLOR &&
            activeStyle.lineWidth &&
            activeStyle.lineWidth > 0
        ) {
            ctx.strokeText(text, x, y);
        }
    }
}
