import type { C_Collider } from '../components/colliders';
import { DEFAULT_CANVAS_ID } from '../constants';
import { type Engine } from '../engine';
import { BoundingBox, type IBoundingBox } from '../math/boundingBox';
import { Matrix2D } from '../math/matrix';
import { type IVector, Vector, type VectorConstructor } from '../math/vector';
import { zoomToScale } from '../utils';
import { System } from './index';
import {
    type CameraPointer,
    type CameraScrollMode,
    type CanvasPointer,
    type CursorType,
    PointerButton,
} from './pointer';

const SCROLL_DELTA_PER_STEP = 120;
const DRAG_CURSOR_PRIORITY = 100;

export interface CameraOptions {
    canvasID?: string;
    canDrag?: boolean;
    dragButtons?: PointerButton[];
    dragCursor?: CursorType;
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
    public static typeString: string = 'CameraSystem';

    #id: string;

    #position: Vector = new Vector(0);
    #rotation: number = 0;
    #zoom: number = 0;
    #scaledZoom: number = zoomToScale(0);
    #target: CameraTarget | null = null;

    #offset: Vector = new Vector(0);
    #scale: Vector = new Vector(1);

    #options: Required<CameraOptions>;
    #isPrimary: boolean = false;

    #worldToScreenMatrix: Matrix2D = new Matrix2D();
    #inverseWorldToScreenMatrix: Matrix2D = new Matrix2D();
    #matricesDirty: boolean = true;

    #boundingBox: BoundingBox = new BoundingBox(0);
    #cullBoundingBox: BoundingBox = new BoundingBox(0);
    #canvasBoundingBox: BoundingBox = new BoundingBox(0);
    #boundsDirty: boolean = true;

    #worldPosition: Vector = new Vector(0);
    #canvasSize: Vector | null = null;
    #prevCanvasSize: Vector | null = null;
    #size: Vector | null = null;

    #isPointerOverCamera: boolean = false;

    #transformHash: string = '';

    constructor(engine: TEngine, id: string) {
        super(engine);

        this.#id = id;
        this.#options = {
            canvasID: DEFAULT_CANVAS_ID,
            canDrag: false,
            dragButtons: [PointerButton.MIDDLE, PointerButton.RIGHT],
            dragCursor: 'grabbing',
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

    override get typeString(): string {
        return CameraSystem.typeString;
    }

    get id(): string {
        return this.#id;
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

    get cameraPointer(): CameraPointer | null {
        return this._engine.getCameraPointer(this.#id);
    }

    get isDragging(): boolean {
        return Boolean(this.cameraPointer?.dragStartCameraPosition);
    }

    get worldToScreenMatrix(): Readonly<Matrix2D> {
        if (!this.#worldToScreenMatrix || this.#matricesDirty) {
            this.#computeMatrices();
            this.#matricesDirty = false;
        }

        return this.#worldToScreenMatrix;
    }

    get inverseWorldToScreenMatrix(): Readonly<Matrix2D> {
        if (!this.#worldToScreenMatrix || this.#matricesDirty) {
            this.#computeMatrices();
            this.#matricesDirty = false;
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

    get canvasBoundingBox(): Readonly<BoundingBox> {
        if (this.#boundsDirty) {
            this.#computeBoundingBox();
            this.#boundsDirty = false;
        }

        return this.#canvasBoundingBox;
    }

    get canvasSize(): Readonly<Vector> | null {
        return this.#canvasSize;
    }

    get size(): Readonly<Vector> | null {
        return this.#size;
    }

    get isPointerOverCamera(): boolean {
        return this.#isPointerOverCamera;
    }

    get canvasID(): string {
        return this.#options.canvasID;
    }

    get isPrimary(): boolean {
        return this.#isPrimary;
    }

    get transformHash(): string {
        return this.#transformHash;
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

    getPointerPosition(): IVector<number> | null {
        const cameraPointer = this._engine.getCameraPointer(this.#id);

        return this.#isPointerOverCamera
            ? this.screenToWorld(
                  cameraPointer.canvasPointer.currentState.position,
              )
            : null;
    }

    getPointerOnScreen(): boolean {
        return this.#isPointerOverCamera;
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
        const { position, rotation, zoom, offset, scale, primary, ...rest } =
            options;
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
        if (offset !== undefined) {
            this.#offset.set(offset);
        }
        if (scale !== undefined) {
            this.#scale.set(scale);
        }

        this.#isPrimary = primary ?? false;

        this.#markDirty();
    }

    override earlyUpdate() {
        if (!this._engine.getCamera(this.#id)) {
            return false;
        }

        if (this.#target) {
            this.#updateTarget(this.#target);
        }

        const cameraPointer = this._engine.getCameraPointer(this.#id);
        const canvasPointer = cameraPointer.canvasPointer;
        this.#updatePointer(cameraPointer, canvasPointer);

        const worldPosition = this.screenToWorld(
            canvasPointer.currentState.position,
        );
        if (worldPosition) {
            this.#worldPosition.set(worldPosition);
            if (this.#isPointerOverCamera) {
                this.#updateAllPointerTargets(
                    this.#worldPosition,
                    canvasPointer,
                );
            }
        }

        let updated = false;
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
        ctx.textBaseline = 'top';

        const cssWidth = canvas.width / dpr;
        const cssHeight = canvas.height / dpr;
        const x = Math.floor(this.#offset.x * cssWidth);
        const y = Math.floor(this.#offset.y * cssHeight);
        const w = Math.ceil((this.#offset.x + this.#scale.x) * cssWidth) - x;
        const h = Math.ceil((this.#offset.y + this.#scale.y) * cssHeight) - y;
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

    #updatePointer(
        cameraPointer: CameraPointer,
        canvasPointer: CanvasPointer,
    ): void {
        let updated = false;
        this.#isPointerOverCamera =
            canvasPointer.currentState.onScreen &&
            this.#canvasBoundingBox.contains(
                canvasPointer.currentState.position,
            );

        if (
            canvasPointer.currentState.scrollDelta !== 0 &&
            this.#isPointerOverCamera
        ) {
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
                        this.#id,
                    );
                    this.#syncDragStartMousePosition(
                        cameraPointer,
                        canvasPointer,
                    );
                }
            }

            cameraPointer.accumulatedScrollDelta +=
                canvasPointer.currentState.scrollDelta;
            cameraPointer.scrollSteps = Math.trunc(
                cameraPointer.accumulatedScrollDelta / SCROLL_DELTA_PER_STEP,
            );
            cameraPointer.accumulatedScrollDelta -=
                cameraPointer.scrollSteps * SCROLL_DELTA_PER_STEP;
            canvasPointer.currentState.scrollDelta = 0;

            updated = true;
        } else {
            cameraPointer.scrollSteps = 0;
        }

        if (this.#options.canDrag) {
            const buttonStates = this.#options.dragButtons.map(
                (btn) => canvasPointer.currentState[btn],
            );
            if (
                buttonStates.some((state) => state.pressed) &&
                !cameraPointer.dragStartMousePosition &&
                this.#isPointerOverCamera
            ) {
                cameraPointer.dragStartMousePosition = new Vector(0);
                cameraPointer.dragStartCameraPosition = new Vector(0);
                this.#syncDragStartMousePosition(cameraPointer, canvasPointer);
                updated = true;
            }

            if (canvasPointer.currentState.justMoved) {
                if (
                    buttonStates.some((state) => state.down) &&
                    cameraPointer.dragStartMousePosition &&
                    cameraPointer.dragStartCameraPosition
                ) {
                    const screenDelta = canvasPointer.currentState.position.sub(
                        cameraPointer.dragStartMousePosition,
                    );
                    this.setPosition(
                        cameraPointer.dragStartCameraPosition.sub(screenDelta),
                    );
                    this.#cancelCameraTarget();
                    updated = true;
                }
            }

            if (
                buttonStates.some((state) => state.released) &&
                cameraPointer.dragStartMousePosition
            ) {
                cameraPointer.dragStartMousePosition = null;
                cameraPointer.dragStartCameraPosition = null;
                updated = true;
            }

            if (cameraPointer.dragStartMousePosition) {
                this.#cancelCameraTarget();
                if (this.#options.dragCursor) {
                    this._engine.requestCursor(
                        this.#options.dragCursor,
                        DRAG_CURSOR_PRIORITY,
                    );
                }
            }
        }

        if (updated) {
            this._engine.forceRenderCamera(this.#id);
        }
    }

    #syncDragStartMousePosition(
        cameraPointer: CameraPointer,
        canvasPointer: CanvasPointer,
    ) {
        if (cameraPointer.dragStartMousePosition) {
            cameraPointer.dragStartMousePosition.set(
                canvasPointer.currentState.position,
            );
            cameraPointer.dragStartCameraPosition?.set(this.#position);
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

    #markDirty(): void {
        this.#matricesDirty = true;
        this.#boundsDirty = true;
        this.#transformHash = this.#computeTransformHash();
    }

    #computeMatrices() {
        const canvas = this._engine.getCanvas(this.#options.canvasID);
        if (!canvas) {
            this.#worldToScreenMatrix.identity();
            this.#inverseWorldToScreenMatrix.identity();
            return;
        }

        this.#worldToScreenMatrix.identity();

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
    }

    #computeBoundingBox(): void {
        const canvas = this._engine.getCanvas(this.#options.canvasID);
        if (!canvas) {
            this.#boundingBox.set(0);
            this.#cullBoundingBox.set(0);
            this.#canvasBoundingBox.set(0);
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

        const canvasSize = this._engine.getCanvasSize(this.#options.canvasID);
        if (canvasSize) {
            this.#canvasBoundingBox.set(
                Math.floor(this.#offset.x * canvasSize.x),
                Math.floor(this.#offset.y * canvasSize.y),
                Math.ceil((this.#offset.x + this.#scale.x) * canvasSize.x),
                Math.ceil((this.#offset.y + this.#scale.y) * canvasSize.y),
            );
        }
    }

    #cancelCameraTarget(): void {
        this.#target = null;
    }

    #computeTransformHash(): string {
        const canvasSize = this._engine.getCanvasSize(this.#options.canvasID);
        if (!canvasSize) {
            return '';
        }

        return `${this.#position.x}|${this.#position.y}|${this.#rotation}|${this.#zoom}|${canvasSize.x}|${canvasSize.y}`;
    }
}
