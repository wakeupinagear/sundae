import type { C_Collider } from '../components/colliders';
import { DEFAULT_CANVAS_ID } from '../constants';
import { type Engine } from '../engine';
import { BoundingBox, type IBoundingBox } from '../math/boundingBox';
import { Matrix2D } from '../math/matrix';
import { type IVector, Vector, type VectorConstructor } from '../math/vector';
import { zoomToScale } from '../utils';
import { System } from './index';
import {
    type CameraScrollMode,
    type CanvasPointer,
    PointerButton,
} from './pointer';

const SCROLL_DELTA_PER_STEP = 120;
const DRAG_CURSOR_PRIORITY = 100;

export interface CameraOptions {
    canvasID?: string;
    canDrag?: boolean;
    dragButtons?: PointerButton[];
    targetLerpSpeed?: number;
    cullScale?: number;
    clearColor?: string;
    scrollMode?: CameraScrollMode;
    zoomSpeed?: number;
    minZoom?: number;
    maxZoom?: number;
    bounds?: IBoundingBox;
}

export interface CameraSystemOptions extends CameraOptions {
    position?: VectorConstructor;
    rotation?: number;
    zoom?: number;

    offset?: VectorConstructor;
    scale?: VectorConstructor;

    primary?: boolean;
}

type CameraTarget =
    | {
          type: 'entity';
          name: string;
      }
    | {
          type: 'fixed';
          position?: VectorConstructor;
          zoom?: number;
          rotation?: number;
      };
export type CameraTargetConstructor =
    | CameraTarget
    | {
          position?: VectorConstructor;
          zoom?: number;
          rotation?: number;
      }
    | string
    | null;

export class CameraSystem<
    TEngine extends Engine = Engine,
> extends System<TEngine> {
    #position: Vector = new Vector(0);
    #rotation: number = 0;
    #zoom: number = 0;
    #scaledZoom: number = zoomToScale(0);
    #target: CameraTarget | null = null;

    #offset: Vector = new Vector(0);
    #scale: Vector = new Vector(1);

    #options: Required<CameraOptions>;
    #cameraID: string;

    #worldToScreenMatrix: Matrix2D | null = null;
    #inverseWorldToScreenMatrix: Matrix2D | null = null;
    #matricesDirty: boolean = true;

    #boundingBox: BoundingBox = new BoundingBox(0);
    #cullBoundingBox: BoundingBox = new BoundingBox(0);
    #boundsDirty: boolean = true;

    #worldPosition: Vector = new Vector(0);
    #canvasSize: Vector | null = null;
    #prevCanvasSize: Vector | null = null;
    #size: Vector | null = null;

    constructor(engine: TEngine, cameraID: string) {
        super(engine);

        this.#cameraID = cameraID;
        this.#options = {
            canvasID: DEFAULT_CANVAS_ID,
            canDrag: false,
            dragButtons: [PointerButton.MIDDLE, PointerButton.RIGHT],
            targetLerpSpeed: 0.1,
            cullScale: 1,
            clearColor: '',
            scrollMode: 'none',
            zoomSpeed: 0.001,
            minZoom: -3, // 2^-3 = 0.125 (1/8x scale)
            maxZoom: 3, // 2^3 = 8 (8x scale)
            bounds: {
                x1: -Infinity,
                x2: Infinity,
                y1: -Infinity,
                y2: Infinity,
            },
        };
    }

    get position(): Readonly<Vector> {
        return this.#position;
    }

    get rotation(): Readonly<number> {
        return this.#rotation;
    }

    get zoom(): Readonly<number> {
        return this.#zoom;
    }

    get worldToScreenMatrix(): Readonly<Matrix2D> | null {
        if (!this.#worldToScreenMatrix || this.#matricesDirty) {
            this.#computeMatrices();
        }

        return this.#worldToScreenMatrix;
    }

    get inverseWorldToScreenMatrix(): Readonly<Matrix2D> | null {
        if (!this.#worldToScreenMatrix || this.#matricesDirty) {
            this.#computeMatrices();
        }

        return this.#inverseWorldToScreenMatrix;
    }

    get boundingBox(): Readonly<BoundingBox> {
        if (this.#boundsDirty) {
            this.#computeBoundingBox();
            this.#boundsDirty = false;
        }

        return this.#boundingBox;
    }

    get cullBoundingBox(): Readonly<BoundingBox> {
        if (this.#boundsDirty) {
            this.#computeBoundingBox();
            this.#boundsDirty = false;
        }

        return this.#cullBoundingBox;
    }

    get canvasSize(): Readonly<Vector> | null {
        return this.#canvasSize;
    }

    get size(): Readonly<Vector> | null {
        return this.#size;
    }

    setPosition(position: VectorConstructor): void {
        const newPosition = new Vector(position);
        const scale = this.#scaledZoom;
        const rotationRad = (this.#rotation * Math.PI) / 180;
        const worldCenter = new Vector(newPosition)
            .rotate(-rotationRad)
            .div(scale);
        worldCenter.x = Math.max(
            this.#options.bounds.x1,
            Math.min(worldCenter.x, this.#options.bounds.x2),
        );
        worldCenter.y = Math.max(
            this.#options.bounds.y1,
            Math.min(worldCenter.y, this.#options.bounds.y2),
        );
        const clampedPosition = new Vector(worldCenter)
            .mul(scale)
            .rotate(rotationRad);
        if (this.#position.set(clampedPosition)) {
            this.#markDirty();
        }
    }

    setRotation(rotation: number): void {
        if (rotation !== this.#rotation) {
            this.#rotation = rotation;
            this.#markDirty();
        }
    }

    rotate(delta: number): void {
        if (delta !== 0) {
            this.#rotation += delta;
            this.#markDirty();
        }
    }

    setZoom(zoom: number): void {
        const clampedZoom = Math.max(
            this.#options.minZoom,
            Math.min(this.#options.maxZoom, zoom),
        );
        if (clampedZoom !== this.#zoom) {
            this.#zoom = clampedZoom;
            this.#scaledZoom = zoomToScale(clampedZoom);
            this.#markDirty();
        }
    }

    zoomBy(delta: number, focalPoint?: IVector<number>): void {
        const oldScale = this.#scaledZoom;
        this.setZoom(this.zoom + delta * this.#options.zoomSpeed);

        if (focalPoint) {
            const newScale = this.#scaledZoom;
            const scaleDelta = newScale - oldScale;
            const rotationRad = (this.rotation * Math.PI) / 180;
            const rotatedFocalPoint = new Vector(focalPoint).rotate(
                rotationRad,
            );

            this.setPosition({
                x: this.position.x + rotatedFocalPoint.x * scaleDelta,
                y: this.position.y + rotatedFocalPoint.y * scaleDelta,
            });
        }
    }

    screenToWorld(position: IVector<number>): IVector<number> | null {
        return (
            this.inverseWorldToScreenMatrix?.transformPoint(position) ?? null
        );
    }

    worldToScreen(position: IVector<number>): IVector<number> | null {
        return this.worldToScreenMatrix?.transformPoint(position) ?? null;
    }

    setTarget(target: CameraTargetConstructor): void {
        if (typeof target === 'string') {
            this.#target = { type: 'entity', name: target };
        } else if (target === null) {
            this.#target = null;
        } else if ('type' in target && target.type === 'entity') {
            this.#target = { type: 'entity', name: target.name };
        } else {
            this.#target = {
                type: 'fixed',
                position: target.position,
                zoom: target.zoom,
                rotation: target.rotation,
            };
        }
    }

    applyOptions(options: CameraSystemOptions): void {
        const { position, rotation, zoom, ...rest } = options;
        for (const key in rest) {
            const value = rest[key as keyof typeof rest];
            if (value !== undefined) {
                this.#options[key as keyof Required<CameraOptions>] =
                    value as never;
            }
        }

        if (position !== undefined) {
            this.setPosition(position);
        }
        if (rotation !== undefined) {
            this.setRotation(rotation);
        }
        if (zoom !== undefined) {
            this.setZoom(zoom);
        }

        this.#markDirty();
    }

    override earlyUpdate() {
        if (this.#target) {
            this.#updateTarget(this.#target);
        }

        const canvasPointer = this._engine.getCanvasPointer(
            this.#options.canvasID,
        );
        let updated = this.#updatePointer(canvasPointer);

        const worldPosition = this.screenToWorld(
            canvasPointer.currentState.position,
        );
        if (worldPosition) {
            this.#worldPosition.set(worldPosition);
            this.#updateAllPointerTargets(this.#worldPosition, canvasPointer);
        }

        const canvas = this._engine.getCanvas(this.#options.canvasID);
        if (canvas) {
            if (!this.#canvasSize) {
                this.#canvasSize = new Vector(canvas.width, canvas.height);
            } else {
                this.#canvasSize.x = canvas.width;
                this.#canvasSize.y = canvas.height;
            }

            if (this.#prevCanvasSize === null && this.#canvasSize !== null) {
                this.#prevCanvasSize = new Vector(this.#canvasSize);
                updated = true;
                this.#markDirty();
            } else if (
                this.#prevCanvasSize !== null &&
                this.#canvasSize !== null &&
                this.#prevCanvasSize.set(this.#canvasSize)
            ) {
                updated = true;
                this.#markDirty();
            }

            if (!this.#size) {
                this.#size = new Vector(
                    this.#canvasSize
                        .mul(this.#scale)
                        .div(this._engine.devicePixelRatio),
                );
            } else {
                this.#size.set(
                    this.#canvasSize
                        .mul(this.#scale)
                        .div(this._engine.devicePixelRatio),
                );
            }
        } else {
            this.#canvasSize = null;
            this.#size = null;
        }

        return updated;
    }

    render(): void {
        const canvas = this._engine.getCanvas(this.#options.canvasID);
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        const dpr = this._engine.devicePixelRatio;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.textAlign = 'left';

        const cssWidth = canvas.width / dpr;
        const cssHeight = canvas.height / dpr;
        const x = Math.floor(this.#offset.x * cssWidth);
        const y = Math.floor(this.#offset.y * cssHeight);
        const w = Math.floor(this.#scale.x * cssWidth);
        const h = Math.floor(this.#scale.y * cssHeight);
        if (
            this.#options.clearColor &&
            this.#options.clearColor !== 'transparent'
        ) {
            ctx.fillStyle = this.#options.clearColor;
            ctx.fillRect(x, y, w, h);
        } else {
            ctx.clearRect(x, y, w, h);
        }

        const isFullScreen =
            w === canvas.width && h === canvas.height && x === 0 && y === 0;
        if (!isFullScreen) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, w, h);
            ctx.clip();
        }

        ctx.translate(x + w / 2, y + h / 2);

        this._engine.renderSystem.render(ctx, this._engine.rootEntity, this);

        if (!isFullScreen) {
            ctx.restore();
        }
    }

    #updateTarget(target: CameraTarget): void {
        if (target.type === 'entity') {
            const entity = this._engine.getEntityByName(target.name);
            if (entity) {
                this.#position.set(entity.position);
            }
        } else if (target.type === 'fixed') {
            if (target.position !== undefined) {
                this.setPosition(target.position);
            }
            if (target.zoom !== undefined) {
                this.setZoom(target.zoom);
            }
            if (target.rotation !== undefined) {
                this.setRotation(target.rotation);
            }
        }
    }

    #updatePointer(canvasPointer: CanvasPointer): boolean {
        let updated = false;
        if (canvasPointer.currentState.scrollDelta !== 0) {
            const scrollMode = this.#options.scrollMode;
            const meta =
                this._engine.getKey('Meta').down ||
                this._engine.getKey('Control').down;
            if (
                scrollMode === 'all' ||
                (scrollMode === 'meta' && meta) ||
                (scrollMode === 'no-meta' && !meta)
            ) {
                const worldPosition = this.screenToWorld(
                    canvasPointer.currentState.position,
                );
                if (worldPosition) {
                    this._engine.zoomCamera(
                        canvasPointer.currentState.scrollDelta,
                        worldPosition,
                        this.#cameraID,
                    );
                }
            }

            canvasPointer.accumulatedScrollDelta +=
                canvasPointer.currentState.scrollDelta;
            canvasPointer.scrollSteps = Math.trunc(
                canvasPointer.accumulatedScrollDelta / SCROLL_DELTA_PER_STEP,
            );
            canvasPointer.accumulatedScrollDelta -=
                canvasPointer.scrollSteps * SCROLL_DELTA_PER_STEP;
            canvasPointer.currentState.scrollDelta = 0;

            updated = true;
        } else {
            canvasPointer.scrollSteps = 0;
        }

        if (this.#options.canDrag) {
            const buttonStates = this.#options.dragButtons.map(
                (btn) => canvasPointer.currentState[btn],
            );
            if (
                buttonStates.some((state) => state.pressed) &&
                !canvasPointer.dragStartMousePosition
            ) {
                canvasPointer.dragStartMousePosition = new Vector(
                    canvasPointer.currentState.position,
                );
                canvasPointer.dragStartCameraPosition = new Vector(
                    this.#position,
                );
                updated = true;
            }

            if (canvasPointer.currentState.justMoved) {
                if (
                    buttonStates.some((state) => state.down) &&
                    canvasPointer.dragStartMousePosition &&
                    canvasPointer.dragStartCameraPosition
                ) {
                    const screenDelta = canvasPointer.currentState.position.sub(
                        canvasPointer.dragStartMousePosition,
                    );
                    this.setPosition(
                        canvasPointer.dragStartCameraPosition.sub(screenDelta),
                    );
                    this.#cancelCameraTarget();
                    updated = true;
                }
            }

            if (
                buttonStates.some((state) => state.released) &&
                canvasPointer.dragStartMousePosition
            ) {
                canvasPointer.dragStartMousePosition = null;
                canvasPointer.dragStartCameraPosition = null;
                updated = true;
            }

            if (canvasPointer.dragStartMousePosition) {
                this.#cancelCameraTarget();
                this._engine.requestCursor(
                    'camera-drag',
                    'grabbing',
                    DRAG_CURSOR_PRIORITY,
                );
            }
        }

        return updated;
    }

    #updateAllPointerTargets(
        pointerWorldPosition: Vector,
        canvasPointer: CanvasPointer,
    ): void {
        const pointerTargets = this.#getAllPointerTargets(pointerWorldPosition);

        for (let i = pointerTargets.length - 1; i >= 0; i--) {
            const pointerTarget = pointerTargets[i];
            pointerTarget.checkIfPointerOver(pointerWorldPosition);
        }

        if (canvasPointer.currentState.justMovedOnScreen) {
            canvasPointer.currentState.justMovedOnScreen = false;
        }
    }

    #getAllPointerTargets(pointerWorldPosition: Vector): C_Collider<TEngine>[] {
        const grid = this._engine.physicsSystem.spatialGrid;
        const entities = grid.queryPoint(pointerWorldPosition);

        return entities
            .map((entity) => entity.collider)
            .filter(Boolean) as C_Collider<TEngine>[];
    }

    #markDirty(): void {
        this.#matricesDirty = true;
        this.#boundsDirty = true;
    }

    #computeMatrices() {
        const canvas = this._engine.getCanvas(this.#options.canvasID);
        if (!canvas) {
            this.#worldToScreenMatrix = null;
            this.#inverseWorldToScreenMatrix = null;
            this.#matricesDirty = false;
            return;
        }

        if (!this.#worldToScreenMatrix) {
            this.#worldToScreenMatrix = new Matrix2D();
        } else {
            this.#worldToScreenMatrix.identity();
        }

        const scale = this.#scaledZoom;
        const dpr = this._engine.devicePixelRatio;
        const cssWidth = canvas.width / dpr;
        const cssHeight = canvas.height / dpr;
        const viewportCenterX =
            this.#offset.x * cssWidth + (this.#scale.x * cssWidth) / 2;
        const viewportCenterY =
            this.#offset.y * cssHeight + (this.#scale.y * cssHeight) / 2;
        this.#worldToScreenMatrix
            .translateSelf(viewportCenterX, viewportCenterY)
            .translateSelf(-this.#position.x, -this.#position.y)
            .rotateSelf(this.#rotation)
            .scaleSelf(scale, scale);
        this.#inverseWorldToScreenMatrix = this.#worldToScreenMatrix.inverse();
        this.#matricesDirty = false;
    }

    #computeBoundingBox(): void {
        const canvas = this._engine.getCanvas(this.#options.canvasID);
        if (!canvas) {
            this.#boundingBox.set(0);
            this.#cullBoundingBox.set(0);
            return;
        }

        const scale = this.#scaledZoom;
        const dpr = this._engine.devicePixelRatio;
        const cssWidth = canvas.width / dpr;
        const cssHeight = canvas.height / dpr;
        const viewportWidth = cssWidth * this.#scale.x;
        const viewportHeight = cssHeight * this.#scale.y;
        const worldSize = {
            x: viewportWidth / scale,
            y: viewportHeight / scale,
        };
        const worldCenterOffset = {
            x: this.#position.x / scale,
            y: this.#position.y / scale,
        };

        const rotationRad = (-this.#rotation * Math.PI) / 180;
        const worldCenter = new Vector(worldCenterOffset)
            .rotate(rotationRad)
            .extract();

        this.#boundingBox = BoundingBox.fromTransformProperties(
            worldCenter,
            worldSize,
            -this.#rotation,
            { x: worldSize.x / 2, y: worldSize.y / 2 },
        );

        const cullScale = this.#options.cullScale;
        const culledWorldSize = {
            x: worldSize.x * cullScale,
            y: worldSize.y * cullScale,
        };
        this.#cullBoundingBox = BoundingBox.fromTransformProperties(
            worldCenter,
            culledWorldSize,
            -this.#rotation,
            { x: culledWorldSize.x / 2, y: culledWorldSize.y / 2 },
        );
    }

    #cancelCameraTarget(): void {
        this.#target = null;
    }
}
