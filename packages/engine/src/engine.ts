import type { Component } from './components';
import type { InternalComponentOptions } from './components';
import {
    type ComponentConstructor,
    type ComponentJSON,
    type CustomComponentJSON,
    createComponentFromJSON,
} from './components/factory';
import { Entity } from './entities';
import type { InternalEntityOptions } from './entities';
import {
    type BaseEntityJSON,
    type CustomEntityJSON,
    type EntityConstructor,
    type EntityJSON,
    type StringEntityJSON,
    createEntityFromJSON,
} from './entities/factory';
import { Matrix2D } from './math/matrix';
import { generatePRNG } from './math/random';
import { VectorConstructor, type IVector } from './math/vector';
import { DebugOverlayScene } from './scenes/DebugOverlay';
import type { System } from './systems';
import { CameraSystem } from './systems/camera';
import { ImageSystem, type LoadedImage } from './systems/image';
import {
    type AxisState,
    type ButtonState,
    type CapturedKey,
    type InputConfig,
    InputSystem,
    type KeyboardKeyState,
} from './systems/input';
import { type I_Logging, type LogOutput, LogSystem } from './systems/log';
import { PhysicsSystem, Raycast, RaycastRequest } from './systems/physics';
import {
    type CameraScrollMode,
    type CursorType,
    PointerButton,
    type PointerButtonState,
    type PointerState,
    PointerSystem,
} from './systems/pointer';
import { RenderSystem } from './systems/render';
import {
    Scene,
    type SceneIdentifier,
    type SceneOptions,
} from './systems/scene';
import { SceneSystem } from './systems/scene';
import { type Stats, StatsSystem } from './systems/stats';
import {
    type Camera,
    type CameraData,
    type ICanvas,
    type WebKey,
} from './types';
import { DEFAULT_CAMERA_OPTIONS } from './utils';

const DEBUG_OVERLAY_SCENE_NAME = '__ENGINE_DEBUG_SCENE__';
const DEBUG_OVERLAY_SCENE_Z_INDEX = 100;

type BrowserEvent =
    | 'mousemove'
    | 'mousewheel'
    | 'mousedown'
    | 'mouseup'
    | 'mouseenter'
    | 'mouseleave'
    | 'mouseover'
    | 'mouseout'
    | 'keydown'
    | 'keyup';

interface BrowserEventMap {
    mousemove: { x: number; y: number };
    mousewheel: { delta: number };
    mousedown: { button: PointerButton };
    mouseup: { button: PointerButton };
    mouseenter: { target: EventTarget | null; x: number; y: number };
    mouseleave: { target: EventTarget | null; x: number; y: number };
    mouseover: { from: EventTarget | null; to: EventTarget | null };
    mouseout: { from: EventTarget | null; to: EventTarget | null };

    keydown: {
        key: WebKey;
        ctrl: boolean;
        meta: boolean;
        shift: boolean;
        alt: boolean;
    };
    keyup: {
        key: WebKey;
        ctrl: boolean;
        meta: boolean;
        shift: boolean;
        alt: boolean;
    };
}

type BrowserEventHandler<T extends BrowserEvent> = (
    event: T,
    data: BrowserEventMap[T],
) => void | boolean;

type TypedEntityJSON = Extract<StringEntityJSON, { type: string }>;
// Utility to get all keys from all members of a union.
// (Plain `keyof (A | B)` gives you the intersection of keys, which is too weak
// for enforcing "no typed-only keys unless `type` is provided".)
type UnionKeys<T> = T extends unknown ? keyof T : never;
type BaseEntityInput = BaseEntityJSON & {
    [K in Exclude<UnionKeys<TypedEntityJSON>, keyof BaseEntityJSON>]?: never;
};

export type SceneConstructor<
    T extends Scene = Scene,
    TEngine extends Engine = Engine,
> = new (options: SceneOptions<TEngine>) => T;

export interface EngineOptions {
    zoomSpeed: number;
    minZoom: number;
    maxZoom: number;
    clearColor: string;

    startScenes: Array<SceneConstructor>;

    cameraStart: CameraData;
    cameraDrag: boolean;
    cameraDragButtons: PointerButton[];
    cameraTargetLerpSpeed: number;
    cameraScrollMode: CameraScrollMode;
    cullScale: number;

    gravityScale: number;
    gravityDirection: VectorConstructor;

    maxCollisionIterations: number;
    physicsPerSecond: number;
    spatialHashCellSize: number;

    images: Record<string, string | HTMLImageElement>;
    asyncImageLoading: boolean;

    inputConfigs: Record<string, InputConfig>;
    capturedKeys: CapturedKey[];

    onReadyForNextFrame: ((startNextFrame: () => void) => void) | null;
    onDestroy: (() => void) | null;

    devicePixelRatio: number;
    delayDeltaTimeByNFrames: number;

    alwaysRender: boolean;
    engineTracesEnabled: boolean;
    debugOverlayEnabled: boolean;
    logOutput: LogOutput | null | undefined;

    randomSeed: number;
}

const DEFAULT_ENGINE_OPTIONS: EngineOptions = {
    zoomSpeed: 0.001,
    minZoom: -3, // 2^-3 = 0.125 (1/8x scale)
    maxZoom: 3, // 2^3 = 8 (8x scale)
    clearColor: 'black',

    startScenes: [],

    cameraStart: {
        position: DEFAULT_CAMERA_OPTIONS.position,
        rotation: DEFAULT_CAMERA_OPTIONS.rotation,
        zoom: DEFAULT_CAMERA_OPTIONS.zoom,
    },
    cameraDrag: false,
    cameraDragButtons: [PointerButton.MIDDLE, PointerButton.RIGHT],
    cameraTargetLerpSpeed: 0.1,
    cameraScrollMode: 'none',
    cullScale: 1,

    maxCollisionIterations: 8,
    physicsPerSecond: 60,
    spatialHashCellSize: 100,

    gravityScale: 9.8 * 20,
    gravityDirection: { x: 0, y: 1 },

    images: {},
    asyncImageLoading: true,

    inputConfigs: {},
    capturedKeys: [],

    onReadyForNextFrame: null,
    onDestroy: null,

    devicePixelRatio: 1,
    delayDeltaTimeByNFrames: 2,

    alwaysRender: false,
    engineTracesEnabled: false,
    debugOverlayEnabled: false,
    logOutput: console,

    randomSeed: 1234567890,
};

export class Engine<TOptions extends EngineOptions = EngineOptions>
    implements I_Logging
{
    protected static _nextId: number = 1;
    protected readonly _id: string = (Engine._nextId++).toString();

    protected _canvas: ICanvas | null = null;
    protected _options: TOptions = { ...DEFAULT_ENGINE_OPTIONS } as TOptions;
    protected _devicePixelRatio: number = 1;

    protected _rootEntity: Entity<this>;

    protected _renderSystem: RenderSystem<this>;
    protected _sceneSystem: SceneSystem<this>;
    protected _inputSystem: InputSystem<this>;
    protected _pointerSystem: PointerSystem<this>;
    protected _imageSystem: ImageSystem<this>;
    protected _cameraSystem: CameraSystem<this>;
    protected _physicsSystem: PhysicsSystem<this>;
    protected _statsSystem: StatsSystem<this>;
    protected _logSystem: LogSystem<this>;

    protected _systems: System[] = [];

    protected _lastTime: number = performance.now();

    #debugOverlayScene: Scene | null = null;

    #forceRender: boolean = true;
    #boundEngineLoop = this.#engineLoop.bind(this);
    #browserEventHandlers: Partial<
        Record<BrowserEvent, BrowserEventHandler<BrowserEvent>[]>
    > = {};

    #frameCount: number = 0;

    #prng!: () => number;

    constructor(options: Partial<TOptions> = {}) {
        this._rootEntity = createEntityFromJSON({
            type: 'entity',
            engine: this,
            parent: null,
            name: 'root',
            cull: 'none',
        });

        // Order of system creation is important
        this._inputSystem = new InputSystem(this);
        this._pointerSystem = new PointerSystem(this);
        this._sceneSystem = new SceneSystem(this);
        this._imageSystem = new ImageSystem(this);
        this._cameraSystem = new CameraSystem(this, this._options.cameraStart);
        this._physicsSystem = new PhysicsSystem(this);

        // Order isn't important since systems are manually updated
        this._statsSystem = new StatsSystem(this);
        this._renderSystem = new RenderSystem(this);
        this._logSystem = new LogSystem(this);

        this.addBrowserEventHandler('mousedown', (_, data) =>
            this.#setPointerButtonDown(data.button, true),
        );
        this.addBrowserEventHandler('mouseup', (_, data) =>
            this.#setPointerButtonDown(data.button, false),
        );
        this.addBrowserEventHandler('mousemove', (_, data) =>
            this.#setPointerPosition(data),
        );
        this.addBrowserEventHandler('mouseenter', (_, data) =>
            this.#setPointerOnScreen(true, data),
        );
        this.addBrowserEventHandler('mouseleave', (_, data) =>
            this.#setPointerOnScreen(false, data),
        );
        this.addBrowserEventHandler('mousewheel', (_, data) => {
            this.#setPointerScrollDelta(data.delta);
        });
        this.addBrowserEventHandler('keydown', (_, data) =>
            this.#setKeyDown(
                data.key,
                true,
                data.ctrl,
                data.meta,
                data.shift,
                data.alt,
            ),
        );
        this.addBrowserEventHandler('keyup', (_, data) =>
            this.#setKeyDown(
                data.key,
                false,
                data.ctrl,
                data.meta,
                data.shift,
                data.alt,
            ),
        );

        this.#setRandomSeed(DEFAULT_ENGINE_OPTIONS.randomSeed);

        this._options = { ...DEFAULT_ENGINE_OPTIONS, ...options } as TOptions;
        this.#applyOptions(this._options);

        for (const sceneCtor of this._options.startScenes) {
            this.openScene(sceneCtor);
        }

        this._options.onReadyForNextFrame?.(this.#boundEngineLoop);
    }

    createEntityFromJSON(
        json:
            | (EntityJSON & InternalEntityOptions<this>)
            | (CustomEntityJSON<EntityConstructor> &
                  InternalEntityOptions<this>),
    ): Entity<this> {
        return createEntityFromJSON<this>(json);
    }

    createComponentFromJSON(
        json:
            | (ComponentJSON & InternalComponentOptions<this>)
            | (CustomComponentJSON<ComponentConstructor> &
                  InternalComponentOptions<this>),
    ): Component<this> {
        return createComponentFromJSON<this>(json);
    }

    get id(): string {
        return this._id;
    }

    get canvas(): ICanvas | null {
        return this._canvas;
    }

    set canvas(canvas: ICanvas | null) {
        this._canvas = canvas;
        this._cameraSystem.worldToScreenMatrixDirty = true;
        this._pointerSystem.canvas = canvas;
        this.#forceRender = true;
    }

    get canvasSize(): IVector<number> | null {
        if (!this._canvas) {
            return null;
        }

        return {
            x: this._canvas.width / this._devicePixelRatio,
            y: this._canvas.height / this._devicePixelRatio,
        };
    }

    get options(): Readonly<TOptions> {
        return this._options;
    }

    set options(newOptions: Partial<TOptions>) {
        this.#applyOptions(newOptions);
    }

    get camera(): Readonly<Camera> {
        return this._cameraSystem.camera;
    }

    set camera(newCamera: Partial<CameraData>) {
        this._cameraSystem.camera = newCamera;
    }

    set cameraTarget(cameraTarget: CameraData | null) {
        this._cameraSystem.cameraTarget = cameraTarget;
    }

    get rootEntity(): Readonly<Entity<this>> {
        return this._rootEntity;
    }

    get worldToScreenMatrix(): Readonly<Matrix2D> {
        return this._cameraSystem.worldToScreenMatrix;
    }

    get inverseWorldToScreenMatrix(): Readonly<Matrix2D> {
        return this._cameraSystem.inverseWorldToScreenMatrix;
    }

    get pointerState(): Readonly<PointerState> {
        return this._pointerSystem.pointerState;
    }

    get stats(): Readonly<Stats> | null {
        return this._statsSystem.stats;
    }

    get pointerSystem(): PointerSystem {
        return this._pointerSystem;
    }

    get cameraSystem(): CameraSystem {
        return this._cameraSystem;
    }

    get sceneSystem(): SceneSystem {
        return this._sceneSystem;
    }

    get renderSystem(): RenderSystem {
        return this._renderSystem;
    }

    get physicsSystem(): PhysicsSystem {
        return this._physicsSystem;
    }

    get frameCount(): number {
        return this.#frameCount;
    }

    requestCursor(id: string, type: CursorType, priority?: number): void {
        this._pointerSystem.requestCursor(id, type, priority);
    }

    forceRender(): void {
        this.#forceRender = true;
    }

    addSystem(system: System): void {
        this._systems.push(system);
    }

    createEntities(...entities: BaseEntityInput[]): Entity<this>[];
    createEntities(...entities: TypedEntityJSON[]): Entity<this>[];
    createEntities<TCtor extends EntityConstructor>(
        ...entities: CustomEntityJSON<TCtor>[]
    ): InstanceType<TCtor>[];
    createEntities(
        ...entities: Array<EntityJSON | CustomEntityJSON<EntityConstructor>>
    ): Entity<this>[] {
        return this.createEntitiesWithParent(entities, this._rootEntity);
    }

    createEntitiesWithParent(
        entities: Array<EntityJSON | CustomEntityJSON<EntityConstructor>>,
        parent: Entity<this>,
    ): Entity<this>[] {
        const createdEntities: Entity<this>[] = [];
        for (const entityJSON of entities) {
            const fullJSON: (EntityJSON | CustomEntityJSON<EntityConstructor>) &
                InternalEntityOptions<this> = {
                engine: this,
                parent: parent,
                ...entityJSON,
            };
            const createdEntity = createEntityFromJSON<this>(fullJSON);
            createdEntities.push(createdEntity);
        }

        return createdEntities;
    }

    openScene<T extends Scene>(
        sceneCtor: SceneConstructor<T, this>,
        options?: Omit<SceneOptions<this>, 'engine'>,
    ): T {
        const scene = new sceneCtor({ engine: this, ...options })
        this._sceneSystem.openScene(scene as unknown as Scene<this>);

        return scene;
    }

    destroyScene(scene: SceneIdentifier<this>): void {
        this._sceneSystem.closeScene(scene);
    }

    screenToWorld(position: IVector<number>): IVector<number> {
        if (!this._canvas) {
            return position;
        }

        return this.inverseWorldToScreenMatrix.transformPoint(position);
    }

    worldToScreen(position: IVector<number>): IVector<number> {
        if (!this._canvas) {
            return position;
        }

        return this.worldToScreenMatrix.transformPoint(position);
    }

    getKey(keyCode: WebKey): Readonly<KeyboardKeyState> {
        return this._inputSystem.getKey(keyCode);
    }

    getButton(button: string): Readonly<ButtonState> {
        return this._inputSystem.getButton(button);
    }

    getAxis(axis: string): Readonly<AxisState> {
        return this._inputSystem.getAxis(axis);
    }

    resetAllKeyboardKeys(): void {
        this._inputSystem.releaseAllKeys();
    }

    getPointerButton(button: PointerButton): Readonly<PointerButtonState> {
        return this._pointerSystem.getPointerButton(button);
    }

    getScrollSteps(): number {
        return this._pointerSystem.scrollSteps;
    }

    capturePointerButtonClick(button: PointerButton): void {
        return this._pointerSystem.capturePointerButtonClick(button);
    }

    getIsCameraDragging(threshold: number = 0): boolean {
        return this.pointerSystem.getIsCameraDragging(threshold);
    }

    setCamera(camera: CameraData): void {
        this._cameraSystem.setCameraPosition(camera.position);
        this._cameraSystem.setCameraRotation(camera.rotation);
        this._cameraSystem.setCameraZoom(camera.zoom);
    }

    setCameraPosition(
        position: IVector<number>,
        cancelCameraTarget: boolean = true,
    ): void {
        this._cameraSystem.setCameraPosition(position);
        if (cancelCameraTarget) {
            this.cameraTarget = null;
        }
    }

    setCameraZoom(zoom: number): void {
        this._cameraSystem.setCameraZoom(zoom);
    }

    zoomCamera(delta: number, focalPoint?: IVector<number>): void {
        this._cameraSystem.zoomCamera(delta, focalPoint);
    }

    setCameraRotation(rotation: number): void {
        this._cameraSystem.setCameraRotation(rotation);
    }

    getImage(name: string): Readonly<LoadedImage> | null {
        return this._imageSystem.getImage(name);
    }

    raycast(request: RaycastRequest<this>): Raycast<this>['result'] {
        return this._physicsSystem.raycast(request);
    }

    addBrowserEventHandler<T extends BrowserEvent>(
        event: T,
        handler: BrowserEventHandler<T>,
    ): void {
        this.#browserEventHandlers[event] ??= [];
        (this.#browserEventHandlers[event] as BrowserEventHandler<T>[]).push(
            handler,
        );
    }

    removeBrowserEventHandler<T extends BrowserEvent>(
        event: T,
        handler: BrowserEventHandler<T>,
    ): void {
        if (this.#browserEventHandlers[event]) {
            this.#browserEventHandlers[event] = this.#browserEventHandlers[
                event
            ].filter((h) => h !== handler);
        }
    }

    onMouseMove: BrowserEventHandler<'mousemove'> = (...args) =>
        this.#handleBrowserEvent(...args);
    onMouseWheel: BrowserEventHandler<'mousewheel'> = (...args) =>
        this.#handleBrowserEvent(...args);
    onMouseDown: BrowserEventHandler<'mousedown'> = (...args) =>
        this.#handleBrowserEvent(...args);
    onMouseUp: BrowserEventHandler<'mouseup'> = (...args) =>
        this.#handleBrowserEvent(...args);
    onMouseEnter: BrowserEventHandler<'mouseenter'> = (...args) =>
        this.#handleBrowserEvent(...args);
    onMouseLeave: BrowserEventHandler<'mouseleave'> = (...args) =>
        this.#handleBrowserEvent(...args);
    onMouseOver: BrowserEventHandler<'mouseover'> = (...args) =>
        this.#handleBrowserEvent(...args);

    onKeyDown: BrowserEventHandler<'keydown'> = (...args) =>
        this.#handleBrowserEvent(...args);
    onKeyUp: BrowserEventHandler<'keyup'> = (...args) =>
        this.#handleBrowserEvent(...args);

    destroy(): void {
        this._options.onDestroy?.();

        this._rootEntity.destroy();

        for (const system of this._systems) {
            system.destroy();
        }
        this._systems = [];
    }

    trace<T>(name: string, callback: () => T): T {
        if (!this._options.engineTracesEnabled) {
            return callback();
        }

        return this._statsSystem.trace(name, callback);
    }

    openDebugOverlay(): void {
        if (!this.#debugOverlayScene) {
            this.#debugOverlayScene = this.openScene(DebugOverlayScene, {
                name: DEBUG_OVERLAY_SCENE_NAME,
                zIndex: DEBUG_OVERLAY_SCENE_Z_INDEX,
            });
        }
    }

    closeDebugOverlay(): void {
        this.destroyScene(DEBUG_OVERLAY_SCENE_NAME);
        this.#debugOverlayScene = null;
    }

    startNextFrame(): void {
        this.#boundEngineLoop();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(_deltaTime: number): boolean | void {}

    log: I_Logging['log'] = (...args) => this._logSystem.log(...args);
    warn: I_Logging['warn'] = (...args) => this._logSystem.warn(...args);
    error: I_Logging['error'] = (...args) => this._logSystem.error(...args);
    logBeforeFrame: I_Logging['logBeforeFrame'] = (n, ...args) =>
        this._logSystem.logBeforeFrame(n, ...args);
    warnBeforeFrame: I_Logging['warnBeforeFrame'] = (n, ...args) =>
        this._logSystem.warnBeforeFrame(n, ...args);
    errorBeforeFrame: I_Logging['errorBeforeFrame'] = (n, ...args) =>
        this._logSystem.errorBeforeFrame(n, ...args);

    random(): number {
        return this.#prng();
    }

    #engineUpdate(deltaTime: number): boolean {
        if (!this._rootEntity.enabled) {
            return false;
        }

        let updated = this.update(deltaTime) ?? false;
        updated = this._rootEntity.engineUpdate(deltaTime) || updated;

        return updated;
    }

    #render() {
        if (!this._canvas || !this.canvasSize) {
            return;
        }

        const ctx = this._canvas.getContext('2d');
        if (!ctx) {
            this.error('Failed to get canvas context');
            return;
        }

        const dpr = this._devicePixelRatio;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.textAlign = 'left';

        const { x: canvasWidth, y: canvasHeight } = this.canvasSize;
        if (
            this.options.clearColor &&
            this.options.clearColor !== 'transparent'
        ) {
            ctx.fillStyle = this.options.clearColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        } else {
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        }
        ctx.translate(canvasWidth / 2, canvasHeight / 2);

        this._renderSystem.render(
            ctx,
            this._rootEntity,
            this._cameraSystem.camera,
        );
        this._cameraSystem.postRender();
    }

    #engineLoop() {
        const currentTime = performance.now();
        const deltaTime =
            this.#frameCount < this.options.delayDeltaTimeByNFrames
                ? 0
                : (currentTime - this._lastTime) * 0.001;
        this._lastTime = currentTime;
        this._statsSystem.update(deltaTime);
        let systemLateUpdated = false;

        this.trace('Update', () => {
            this.#forceRender ||= this.options.alwaysRender;

            for (const system of this._systems) {
                this.trace(`${system.constructor.name}.early`, () => {
                    const updated = system.earlyUpdate(deltaTime) ?? false;
                    if (updated === true) {
                        this.#forceRender = true;
                    }
                });
            }

            this.trace('engineUpdate', () => {
                const engineUpdated = this.#engineUpdate(deltaTime);
                if (engineUpdated) {
                    this.#forceRender = true;
                }
            });

            for (const system of this._systems) {
                this.trace(`${system.constructor.name}.late`, () => {
                    const updated = system.lateUpdate(deltaTime) ?? false;
                    if (updated === true) {
                        this.#forceRender = true;
                        systemLateUpdated = true;
                    }
                });
            }

            const loadingImages = this._imageSystem.getLoadingImages();
            this.#forceRender =
                this.#forceRender &&
                (this.options.asyncImageLoading || loadingImages.length === 0);
        });

        this.trace('Render', () => {
            if (this.#forceRender) {
                this.#render();
                this.#forceRender = false;
            }
        });

        if (systemLateUpdated) {
            this.#forceRender = true;
        }

        this.#frameCount++;

        this._options.onReadyForNextFrame?.(this.#boundEngineLoop);
    }

    #handleBrowserEvent(
        event: BrowserEvent,
        data: BrowserEventMap[BrowserEvent],
    ): boolean {
        let preventDefault = false;
        this.#browserEventHandlers[event]?.forEach((handler) => {
            const result = handler(event, data);
            if (result === true) {
                preventDefault = true;
            }
        });

        return preventDefault;
    }

    #setKeyDown(
        key: WebKey,
        down: boolean,
        ctrl: boolean,
        meta: boolean,
        shift: boolean,
        alt: boolean,
    ): boolean {
        return this._inputSystem.keyStateChange(
            key,
            down,
            ctrl,
            meta,
            shift,
            alt,
        );
    }

    #setPointerPosition(position: IVector<number>): void {
        this._pointerSystem.pointerPosition.set(position);
    }

    #setPointerOnScreen(onScreen: boolean, position: IVector<number>): void {
        this._pointerSystem.pointerPosition.set(position);
        this._pointerSystem.pointerOnScreen = onScreen;
    }

    #setPointerScrollDelta(delta: number): void {
        this._pointerSystem.pointerScrollDelta = delta;
    }

    #setPointerButtonDown(button: PointerButton, down: boolean): void {
        this._pointerSystem.pointerButtonStateChange(button, down);
    }

    #applyOptions(newOptions: Partial<TOptions>): void {
        if (this._options.cullScale !== newOptions.cullScale) {
            this._cameraSystem.onCameraChanged();
        }

        this._options = { ...this._options, ...newOptions };

        this._cameraSystem.applyCameraZoomClamp();

        for (const name in this._options.images) {
            const src = this._options.images[name];
            this._imageSystem.loadImage(name, src);
        }
        this._options.images = {};

        if (newOptions.capturedKeys) {
            this._inputSystem.setCapturedKeys(newOptions.capturedKeys);
        }
        if (newOptions.inputConfigs) {
            this._inputSystem.setInputConfigs(newOptions.inputConfigs);
        }

        if (
            this._options.debugOverlayEnabled !==
            Boolean(this.#debugOverlayScene)
        ) {
            if (this._options.debugOverlayEnabled) {
                this.openDebugOverlay();
            } else {
                this.closeDebugOverlay();
            }
        }

        if (newOptions.logOutput !== undefined) {
            this._logSystem.logOutput = newOptions.logOutput;
        }

        if (newOptions.devicePixelRatio !== undefined) {
            this._devicePixelRatio = newOptions.devicePixelRatio;
        }

        if (newOptions.randomSeed !== undefined) {
            this.#setRandomSeed(newOptions.randomSeed);
        }

        if (newOptions.gravityScale !== undefined) {
            this._physicsSystem.gravityScale = newOptions.gravityScale;
        }
        if (newOptions.gravityDirection !== undefined) {
            this._physicsSystem.gravityDirection = newOptions.gravityDirection;
        }
    }

    #setRandomSeed(seed: number): void {
        this.#prng = generatePRNG(seed);
    }
}
