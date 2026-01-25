import type { C_Collider } from '../components/colliders';
import { DEFAULT_CANVAS_ID } from '../constants';
import { type Engine } from '../engine';
import type { Entity } from '../entities';
import { Matrix2D } from '../math/matrix';
import { type IVector, Vector, type VectorConstructor } from '../math/vector';
import type { BoundingBox } from '../types';
import { calculateRectangleBoundingBox, zoomToScale } from '../utils';
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
    scrollMode?: CameraScrollMode;
    cullScale?: number;
    clearColor?: string;
}

const DEFAULT_CAMERA_OPTIONS: Required<CameraOptions> = {
    canDrag: false,
    dragButtons: [PointerButton.MIDDLE, PointerButton.RIGHT],
    targetLerpSpeed: 0.1,
    scrollMode: 'none',
    cullScale: 1,
    clearColor: '',
    canvasID: DEFAULT_CANVAS_ID,
};

export interface CameraSystemOptions extends CameraOptions {
    position?: VectorConstructor;
    rotation?: number;
    zoom?: number;

    offset?: VectorConstructor;
    scale?: VectorConstructor;
}

export class CameraSystem<
    TEngine extends Engine = Engine,
> extends System<TEngine> {
    #position: Vector = new Vector(0);
    #rotation: number = 0;
    #zoom: number = 0;

    #offset: Vector = new Vector(0);
    #scale: Vector = new Vector(1);

    #options: Required<CameraOptions>;
    #cameraID: string;

    #worldToScreenMatrix: Matrix2D | null = null;
    #inverseWorldToScreenMatrix: Matrix2D | null = null;
    #matricesDirty: boolean = true;

    #boundingBox: BoundingBox | null = null;
    #cullBoundingBox: BoundingBox | null = null;
    #boundsDirty: boolean = true;

    constructor(engine: TEngine, cameraID: string) {
        super(engine);

        this.#cameraID = cameraID;
        this.#options = { ...DEFAULT_CAMERA_OPTIONS };
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
        if (!this.#boundingBox || this.#boundsDirty) {
            this.#computeBoundingBox();
            this.#boundsDirty = false;
        }

        return this.#boundingBox!;
    }

    get cullBoundingBox(): Readonly<BoundingBox> {
        if (!this.#cullBoundingBox || this.#boundsDirty) {
            this.#computeBoundingBox();
            this.#boundsDirty = false;
        }

        return this.#cullBoundingBox!;
    }

    setPosition(position: VectorConstructor): void {
        if (this.#position.set(position)) {
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
            this._engine.options.minZoom,
            Math.min(this._engine.options.maxZoom, zoom),
        );
        if (clampedZoom !== this.#zoom) {
            this.#zoom = clampedZoom;
            this.#markDirty();
        }
    }

    zoomBy(delta: number, focalPoint?: IVector<number>): void {
        const oldZoom = this.zoom;
        const oldScale = zoomToScale(oldZoom);
        this.setZoom(this.zoom + delta * this._engine.options.zoomSpeed);

        if (focalPoint) {
            const newScale = zoomToScale(this.zoom);
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
        const matrix = this.inverseWorldToScreenMatrix;
        if (!matrix) {
            return null;
        }
        return matrix.transformPoint(position);
    }

    worldToScreen(position: IVector<number>): IVector<number> | null {
        const matrix = this.worldToScreenMatrix;
        if (!matrix) {
            return null;
        }
        return matrix.transformPoint(position);
    }

    applyOptions(options: CameraSystemOptions): void {
        if (options.offset !== undefined) {
            this.#offset.set(options.offset);
        }
        if (options.scale !== undefined) {
            this.#scale.set(options.scale);
        }
        if (options.canvasID !== undefined) {
            this.#options.canvasID = options.canvasID;
        }
        if (options.canDrag !== undefined) {
            this.#options.canDrag = options.canDrag;
        }
        if (options.dragButtons !== undefined) {
            this.#options.dragButtons = options.dragButtons;
        }
        if (options.targetLerpSpeed !== undefined) {
            this.#options.targetLerpSpeed = options.targetLerpSpeed;
        }
        if (options.scrollMode !== undefined) {
            this.#options.scrollMode = options.scrollMode;
        }
        if (options.cullScale !== undefined) {
            this.#options.cullScale = options.cullScale;
        }
        if (options.clearColor !== undefined) {
            this.#options.clearColor = options.clearColor;
        } else {
            this.#options.clearColor = this._engine.options.clearColor;
        }

        if (options.position !== undefined) {
            this.setPosition(options.position);
        }
        if (options.rotation !== undefined) {
            this.setRotation(options.rotation);
        }
        if (options.zoom !== undefined) {
            this.setZoom(options.zoom);
        }

        this.#markDirty();
    }

    override earlyUpdate() {
        const canvasPointer = this._engine.getCanvasPointer(
            this.#options.canvasID,
        );
        this.#updatePointer(canvasPointer);

        const worldPosition = this.screenToWorld(
            canvasPointer.currentState.position,
        );
        if (worldPosition) {
            // TODO: cache vector
            this.#updateAllPointerTargets(
                new Vector(worldPosition),
                canvasPointer,
            );
        }
    }

    #updatePointer(canvasPointer: CanvasPointer): void {
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
                this._engine.zoomCamera(
                    canvasPointer.currentState.scrollDelta,
                    canvasPointer.currentState.position,
                    this.#cameraID,
                );
            }

            canvasPointer.accumulatedScrollDelta +=
                canvasPointer.currentState.scrollDelta;
            canvasPointer.scrollSteps = Math.trunc(
                canvasPointer.accumulatedScrollDelta / SCROLL_DELTA_PER_STEP,
            );
            canvasPointer.accumulatedScrollDelta -=
                canvasPointer.scrollSteps * SCROLL_DELTA_PER_STEP;
            canvasPointer.currentState.scrollDelta = 0;
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
                canvasPointer.dragStartMousePosition =
                    canvasPointer.currentState.position.extract();
                canvasPointer.dragStartCameraPosition =
                    this.#position.extract();
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
                    const scale = zoomToScale(this.#zoom);
                    // Convert screen delta to world delta (accounting for zoom)
                    const worldDelta = screenDelta.scaleBy(1 / scale);
                    // Account for camera rotation
                    const rotationRad = (-this.#rotation * Math.PI) / 180;
                    const rotatedDelta = worldDelta.rotate(rotationRad);
                    // Subtract because dragging content right means camera moves left
                    this.setPosition(
                        new Vector(canvasPointer.dragStartCameraPosition).sub(
                            rotatedDelta,
                        ),
                    );
                    this.#cancelCameraTarget();
                }
            }

            if (
                buttonStates.some((state) => state.released) &&
                canvasPointer.dragStartMousePosition
            ) {
                canvasPointer.dragStartMousePosition = null;
                canvasPointer.dragStartCameraPosition = null;
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

        this._engine.renderSystem.render(
            ctx,
            // TODO: remove type cast
            this._engine.rootEntity as Entity<TEngine>,
            this,
        );

        if (!isFullScreen) {
            ctx.restore();
        }
    }

    #markDirty(): void {
        this.#matricesDirty = true;
        this.#boundsDirty = true;
    }

    #computeMatrices() {
        const canvas = this._engine.getCanvas(this.#options.canvasID);
        if (!canvas) {
            // No canvas means we can't compute proper matrices
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

        const scale = zoomToScale(this.#zoom);
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
            this.#boundingBox = { x1: 0, x2: 0, y1: 0, y2: 0 };
            this.#cullBoundingBox = { x1: 0, x2: 0, y1: 0, y2: 0 };
            return;
        }

        const scale = zoomToScale(this.#zoom);
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

        this.#boundingBox = calculateRectangleBoundingBox(
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
        this.#cullBoundingBox = calculateRectangleBoundingBox(
            worldCenter,
            culledWorldSize,
            -this.#rotation,
            { x: culledWorldSize.x / 2, y: culledWorldSize.y / 2 },
        );
    }

    #cancelCameraTarget(): void {
        // TODO: Cancel camera target
    }
}
