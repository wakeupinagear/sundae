import type { Component } from './components';
import type { InternalComponentOptions } from './components';
import {
    type ComponentConstructor,
    type ComponentJSON,
    type CustomComponentJSON,
    createComponentFromJSON,
} from './components/factory';
import { DEFAULT_CAMERA_ID, DEFAULT_CANVAS_ID } from './constants';
import { type Entity } from './entities';
import type { InternalEntityOptions } from './entities';
import {
    type BaseEntityJSON,
    type CustomEntityJSON,
    type EntityConstructor,
    type EntityJSON,
    type StringEntityJSON,
    createEntityFromJSON,
} from './entities/factory';
import { generatePRNG } from './math/random';
import { type IVector, type VectorConstructor } from './math/vector';
import { DebugOverlayFlags, DebugOverlayScene } from './scenes/DebugOverlay';
import type { System } from './systems';
import {
    type CameraOptions,
    CameraSystem,
    type CameraSystemOptions,
    type CameraTargetConstructor,
} from './systems/camera';
import { ImageSystem, type LoadedImage } from './systems/image';
import {
    type AxisState,
    type ButtonState,
    type CapturedKey,
    type InputConfig,
    InputSystem,
    type KeyboardKeyState,
} from './systems/input';
import { type I_LogSystem, type LogOutput, LogSystem } from './systems/log';
import {
    PhysicsSystem,
    type Raycast,
    type RaycastRequest,
} from './systems/physics';
import {
    type CameraPointer,
    type I_PointerSystem,
    type PointerButton,
    PointerSystem,
} from './systems/pointer';
import { RenderSystem } from './systems/render';
import {
    type Scene,
    type SceneIdentifier,
    type SceneOptions,
} from './systems/scene';
import { SceneSystem } from './systems/scene';
import { type Stats, StatsSystem } from './systems/stats';
import { type ICanvas, type Platform, type WebKey } from './types';

const DEBUG_OVERLAY_SCENE_NAME = '__ENGINE_DEBUG_SCENE__';
const DEBUG_OVERLAY_SCENE_Z_INDEX = 100;

type BrowserWindowEvent = 'keydown' | 'keyup';

type BrowserCanvasEvent =
    | 'pointermove'
    | 'pointerdown'
    | 'pointerup'
    | 'pointercancel'
    | 'pointerenter'
    | 'pointerleave'
    | 'pointerover'
    | 'pointerout'
    | 'wheel';

interface BrowserEventMap {
    pointermove: { x: number; y: number };
    pointerdown: { button: PointerButton };
    pointerup: { button: PointerButton };
    pointercancel: { button: PointerButton };
    pointerenter: { target: EventTarget | null; x: number; y: number };
    pointerleave: { target: EventTarget | null; x: number; y: number };
    pointerover: { from: EventTarget | null; to: EventTarget | null };
    pointerout: { from: EventTarget | null; to: EventTarget | null };
    wheel: { delta: number };

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

type BrowserWindowEventHandler<T extends BrowserWindowEvent> = (
    event: T,
    data: BrowserEventMap[T],
) => void | boolean;

type BrowserCanvasEventHandler<T extends BrowserCanvasEvent> = (
    event: T,
    canvasID: string,
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

/** Rest parameters of a scene's create() method (after the engine argument). */
export type SceneCreateArgs<T extends Scene> = T extends {
    create(_e: unknown, ...args: infer A): unknown;
}
    ? A
    : [];

export interface EngineOptions {
    cameras: Record<string, CameraSystemOptions>;
    cameraOptions: CameraOptions;
    canvasClearColor: string;

    startScenes: Array<SceneConstructor>;

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
    engineTraces: boolean;
    debugOverlay: boolean | number | DebugOverlayFlags;
    logOutput: LogOutput | null | undefined;

    randomSeed: number;
}

const DEFAULT_ENGINE_OPTIONS: EngineOptions = {
    cameras: {
        [DEFAULT_CAMERA_ID]: {},
    },
    cameraOptions: {
        clearColor: 'black',
    },
    canvasClearColor: 'transparent',

    startScenes: [],

    maxCollisionIterations: 8,
    physicsPerSecond: 120,
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
    engineTraces: false,
    debugOverlay: false,
    logOutput: console,

    randomSeed: 1234567890,
};

export class Engine<TOptions extends EngineOptions = EngineOptions>
    implements I_LogSystem, I_PointerSystem
{
    protected static _nextId: number = 1;
    protected readonly _id: string = (Engine._nextId++).toString();

    protected _canvases: Record<string, ICanvas | null> = {};

    protected _options: TOptions = { ...DEFAULT_ENGINE_OPTIONS } as TOptions;
    protected _devicePixelRatio: number = 1;
    protected _platform: Platform = 'unknown';

    protected _rootEntity: Entity<this>;

    protected _renderSystem: RenderSystem<this>;
    protected _sceneSystem: SceneSystem<this>;
    protected _inputSystem: InputSystem<this>;
    protected _pointerSystem: PointerSystem<this>;
    protected _imageSystem: ImageSystem<this>;
    protected _physicsSystem: PhysicsSystem<this>;
    protected _statsSystem: StatsSystem<this>;
    protected _logSystem: LogSystem<this>;
    protected _cameraSystems: Record<string, CameraSystem<this>> = {};

    protected _systems: System[] = [];

    protected _lastTime: number = performance.now();

    #debugOverlayScene: DebugOverlayScene<this> | null = null;

    #forceRender: boolean = true;
    #forceRenderCameras: Set<string> = new Set();
    #boundEngineLoop = this.#engineLoop.bind(this);

    #browserWindowEventHandlers: Partial<
        Record<
            BrowserWindowEvent,
            BrowserWindowEventHandler<BrowserWindowEvent>[]
        >
    > = {};
    #browserCanvasEventHandlers: Partial<
        Record<
            BrowserCanvasEvent,
            BrowserCanvasEventHandler<BrowserCanvasEvent>[]
        >
    > = {};

    #frameCount: number = 0;

    #primaryCameraID: string | null = null;
    #primaryCanvasID: string | null = null;

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
        this._physicsSystem = new PhysicsSystem(this);

        // Order isn't important since systems are manually updated
        this._statsSystem = new StatsSystem(this);
        this._renderSystem = new RenderSystem(this);
        this._logSystem = new LogSystem(this);

        this.#setRandomSeed(DEFAULT_ENGINE_OPTIONS.randomSeed);
        this.#applyOptions(DEFAULT_ENGINE_OPTIONS as Partial<TOptions>);
        this.#applyOptions(options);

        this.addBrowserWindowEventHandler('keydown', (_, data) =>
            this.#setKeyDown(
                data.key,
                true,
                data.ctrl,
                data.meta,
                data.shift,
                data.alt,
            ),
        );
        this.addBrowserWindowEventHandler('keyup', (_, data) =>
            this.#setKeyDown(
                data.key,
                false,
                data.ctrl,
                data.meta,
                data.shift,
                data.alt,
            ),
        );

        this.addBrowserCanvasEventHandler('pointerdown', (_, canvasID, data) =>
            this.setPointerButtonDown(data.button, true, canvasID),
        );
        this.addBrowserCanvasEventHandler('pointerup', (_, canvasID, data) =>
            this.setPointerButtonDown(data.button, false, canvasID),
        );
        this.addBrowserCanvasEventHandler('pointermove', (_, canvasID, data) =>
            this.setPointerPosition(data, canvasID),
        );
        this.addBrowserCanvasEventHandler('pointerenter', (_, canvasID, data) =>
            this.setPointerOnScreen(true, data, canvasID),
        );
        this.addBrowserCanvasEventHandler('pointerleave', (_, canvasID, data) =>
            this.setPointerOnScreen(false, data, canvasID),
        );
        this.addBrowserCanvasEventHandler('wheel', (_, canvasID, data) =>
            this.setPointerScrollDelta(data.delta, canvasID),
        );

        for (const sceneCtor of this._options.startScenes) {
            this.openScene(
                sceneCtor as unknown as SceneConstructor<Scene<this>, this>,
            );
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

    get options(): Readonly<TOptions> {
        return this._options;
    }

    set options(newOptions: Partial<TOptions>) {
        this.#applyOptions(newOptions);
    }

    get rootEntity(): Readonly<Entity<this>> {
        return this._rootEntity;
    }

    get stats(): Readonly<Stats> | null {
        return this._statsSystem.stats;
    }

    get pointerSystem(): PointerSystem<this> {
        return this._pointerSystem;
    }

    get sceneSystem(): SceneSystem<this> {
        return this._sceneSystem;
    }

    get renderSystem(): RenderSystem<this> {
        return this._renderSystem;
    }

    get physicsSystem(): PhysicsSystem<this> {
        return this._physicsSystem;
    }

    get frameCount(): number {
        return this.#frameCount;
    }

    get devicePixelRatio(): number {
        return this._devicePixelRatio;
    }

    forceRender(): void {
        this.#forceRender = true;
    }

    forceRenderCamera(cameraID: string): void {
        this.#forceRenderCameras.add(cameraID);
    }

    addSystem(system: System): void {
        this._systems.push(system);
    }

    removeSystem(system: System): void {
        this._systems = this._systems.filter((s) => s !== system);
    }

    getPlatform(): Platform {
        return this._platform;
    }

    setPlatform(platform: Platform): void {
        this._platform = platform;
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

    getEntityByName(name: string): Entity<this> | null {
        return this._rootEntity.getEntityByName(name);
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

    openScene<T extends Scene<this>>(
        sceneCtor: SceneConstructor<T, this>,
        options?: Omit<SceneOptions<this>, 'engine'> & {
            createArgs?: SceneCreateArgs<T>;
        },
    ): T {
        const { createArgs, ...sceneOptions } = options ?? {};
        const scene = new sceneCtor({
            engine: this,
            ...sceneOptions,
        }) as T;
        this._sceneSystem.openScene(
            scene as unknown as Scene<this>,
            createArgs ?? [],
        );

        return scene;
    }

    destroyScene(scene: SceneIdentifier<this>): void {
        this._sceneSystem.closeScene(scene);
    }

    setCanvas(
        canvas: ICanvas | null,
        id = this.#primaryCanvasID || DEFAULT_CANVAS_ID,
    ): void {
        if (canvas) {
            this._canvases[id] = canvas;
        } else {
            delete this._canvases[id];
        }

        this.#forceRender = true;
        if (!this.#primaryCanvasID && canvas) {
            this.#primaryCanvasID = id;
        }
    }

    getCanvas(id: string): ICanvas | null {
        return this._canvases[id] ?? null;
    }

    getCanvasSize(id: string): IVector<number> | null {
        const canvas = this.getCanvas(id);
        if (canvas) {
            return {
                x: canvas.width / this.devicePixelRatio,
                y: canvas.height / this.devicePixelRatio,
            };
        }

        return null;
    }

    screenToWorld(
        position: IVector<number>,
        cameraID = this.#getPrimaryCameraID(),
    ): IVector<number> | null {
        return this._cameraSystems[cameraID]?.screenToWorld(position) ?? null;
    }

    worldToScreen(
        position: IVector<number>,
        cameraID = this.#getPrimaryCameraID(),
    ): IVector<number> | null {
        return this._cameraSystems[cameraID]?.worldToScreen(position) ?? null;
    }

    setCameraTarget(
        target: CameraTargetConstructor,
        cameraID = this.#getPrimaryCameraID(),
    ): void {
        this._cameraSystems[cameraID]?.setTarget(target);
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

    getCamera(
        cameraID = this.#getPrimaryCameraID(),
    ): CameraSystem<this> | null {
        return this._cameraSystems[cameraID] ?? null;
    }

    setCameraPosition(
        position: IVector<number>,
        cancelCameraTarget: boolean = true,
        cameraID = this.#getPrimaryCameraID(),
    ): void {
        const camera = this.getCamera(cameraID);
        if (camera) {
            camera.setPosition(position);
            if (cancelCameraTarget) {
                camera.setTarget(null);
            }
        }
    }

    setAllCamerasPositions(position: IVector<number>): void {
        for (const camera of Object.values(this._cameraSystems)) {
            camera.setPosition(position);
        }
    }

    setCameraZoom(zoom: number, cameraID = this.#getPrimaryCameraID()): void {
        this._cameraSystems[cameraID]?.setZoom(zoom);
    }

    setAllCamerasZooms(zoom: number): void {
        for (const camera of Object.values(this._cameraSystems)) {
            camera.setZoom(zoom);
        }
    }

    zoomCamera(
        delta: number,
        focalPoint?: IVector<number>,
        cameraID = this.#getPrimaryCameraID(),
    ): void {
        this._cameraSystems[cameraID]?.zoomBy(delta, focalPoint);
    }

    zoomAllCameras(delta: number): void {
        for (const camera of Object.values(this._cameraSystems)) {
            camera.zoomBy(delta);
        }
    }

    setCameraRotation(
        rotation: number,
        cameraID = this.#getPrimaryCameraID(),
    ): void {
        this._cameraSystems[cameraID]?.setRotation(rotation);
    }

    setAllCamerasRotations(rotation: number): void {
        for (const camera of Object.values(this._cameraSystems)) {
            camera.setRotation(rotation);
        }
    }

    rotateCamera(delta: number, cameraID = this.#getPrimaryCameraID()): void {
        this._cameraSystems[cameraID]?.rotate(delta);
    }

    rotateAllCameras(delta: number): void {
        for (const camera of Object.values(this._cameraSystems)) {
            camera.rotate(delta);
        }
    }

    getImage(name: string): Readonly<LoadedImage> | null {
        return this._imageSystem.getImage(name);
    }

    raycast(request: RaycastRequest<this>): Raycast<this>['result'] {
        return this._physicsSystem.raycast(request);
    }

    addBrowserWindowEventHandler<T extends BrowserWindowEvent>(
        event: T,
        handler: BrowserWindowEventHandler<T>,
    ): void {
        this.#browserWindowEventHandlers[event] ??= [];
        (
            this.#browserWindowEventHandlers[
                event
            ] as BrowserWindowEventHandler<T>[]
        ).push(handler);
    }

    removeBrowserWindowEventHandler<T extends BrowserWindowEvent>(
        event: T,
        handler: BrowserWindowEventHandler<T>,
    ): void {
        if (this.#browserWindowEventHandlers[event]) {
            this.#browserWindowEventHandlers[event] =
                this.#browserWindowEventHandlers[event].filter(
                    (h) => h !== handler,
                );
        }
    }

    addBrowserCanvasEventHandler<T extends BrowserCanvasEvent>(
        event: T,
        handler: BrowserCanvasEventHandler<T>,
    ): void {
        this.#browserCanvasEventHandlers[event] ??= [];
        (
            this.#browserCanvasEventHandlers[
                event
            ] as BrowserCanvasEventHandler<T>[]
        ).push(handler);
    }

    removeBrowserCanvasEventHandler<T extends BrowserCanvasEvent>(
        event: T,
        handler: BrowserCanvasEventHandler<T>,
    ): void {
        if (this.#browserCanvasEventHandlers[event]) {
            this.#browserCanvasEventHandlers[event] =
                this.#browserCanvasEventHandlers[event].filter(
                    (h) => h !== handler,
                );
        }
    }

    onKeyDown: BrowserWindowEventHandler<'keydown'> = (...args) =>
        this.#handleBrowserWindowEvent(...args);
    onKeyUp: BrowserWindowEventHandler<'keyup'> = (...args) =>
        this.#handleBrowserWindowEvent(...args);

    onPointerMove: BrowserCanvasEventHandler<'pointermove'> = (...args) =>
        this.#handleBrowserCanvasEvent(...args);
    onWheel: BrowserCanvasEventHandler<'wheel'> = (...args) =>
        this.#handleBrowserCanvasEvent(...args);
    onPointerDown: BrowserCanvasEventHandler<'pointerdown'> = (...args) =>
        this.#handleBrowserCanvasEvent(...args);
    onPointerUp: BrowserCanvasEventHandler<'pointerup'> = (...args) =>
        this.#handleBrowserCanvasEvent(...args);
    onPointerEnter: BrowserCanvasEventHandler<'pointerenter'> = (...args) =>
        this.#handleBrowserCanvasEvent(...args);
    onPointerLeave: BrowserCanvasEventHandler<'pointerleave'> = (...args) =>
        this.#handleBrowserCanvasEvent(...args);
    onPointerOver: BrowserCanvasEventHandler<'pointerover'> = (...args) =>
        this.#handleBrowserCanvasEvent(...args);

    getPointerPosition(
        cameraID = this.#getPrimaryCameraID(),
    ): IVector<number> | null {
        return this._cameraSystems[cameraID]?.getPointerPosition() ?? null;
    }

    getPointerOnScreen(cameraID = this.#getPrimaryCameraID()): boolean {
        return this._cameraSystems[cameraID]?.getPointerOnScreen() ?? false;
    }

    getCameraPointer(cameraID = this.#getPrimaryCameraID()): CameraPointer {
        return this._pointerSystem.getCameraPointer(cameraID);
    }

    setPointerButtonDown: I_PointerSystem['setPointerButtonDown'] = (
        button,
        down,
        canvasID,
    ) => {
        this._pointerSystem.setPointerButtonDown(button, down, canvasID);
    };

    setPointerPosition: I_PointerSystem['setPointerPosition'] = (
        position,
        canvasID,
    ) => {
        this._pointerSystem.setPointerPosition(position, canvasID);
    };

    setPointerOnScreen: I_PointerSystem['setPointerOnScreen'] = (
        onScreen,
        position,
        canvasID,
    ) => {
        this._pointerSystem.setPointerOnScreen(onScreen, position, canvasID);
    };

    setPointerScrollDelta: I_PointerSystem['setPointerScrollDelta'] = (
        delta,
        canvasID,
    ) => {
        this._pointerSystem.setPointerScrollDelta(delta, canvasID);
    };

    capturePointerButtonClick: I_PointerSystem['capturePointerButtonClick'] = (
        button,
        canvasID,
    ) => {
        this._pointerSystem.capturePointerButtonClick(button, canvasID);
    };

    requestCursor: I_PointerSystem['requestCursor'] = (
        type,
        priority,
        canvasID,
    ) => {
        this._pointerSystem.requestCursor(type, priority, canvasID);
    };

    destroy(): void {
        this._options.onDestroy?.();

        this._rootEntity.destroy();

        for (const system of this._systems) {
            system.destroy();
        }
        this._systems = [];
    }

    trace<T>(name: string, callback: () => T): T {
        if (!this._options.engineTraces) {
            return callback();
        }

        return this._statsSystem.trace(name, callback);
    }

    enableDebugOverlay(flags: DebugOverlayFlags): void {
        if (!this.#debugOverlayScene) {
            this.#debugOverlayScene = this.openScene(DebugOverlayScene, {
                name: DEBUG_OVERLAY_SCENE_NAME,
                zIndex: DEBUG_OVERLAY_SCENE_Z_INDEX,
                createArgs: [flags],
            });
        } else {
            this.#debugOverlayScene.setFlags(flags);
        }
    }

    disableDebugOverlay(): void {
        this.destroyScene(DEBUG_OVERLAY_SCENE_NAME);
        this.#debugOverlayScene = null;
    }

    startNextFrame(): void {
        this.#boundEngineLoop();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(_deltaTime: number): boolean | void {}

    log: I_LogSystem['log'] = (...args) => this._logSystem.log(...args);
    warn: I_LogSystem['warn'] = (...args) => this._logSystem.warn(...args);
    error: I_LogSystem['error'] = (...args) => this._logSystem.error(...args);
    logBeforeFrame: I_LogSystem['logBeforeFrame'] = (n, ...args) =>
        this._logSystem.logBeforeFrame(n, ...args);
    warnBeforeFrame: I_LogSystem['warnBeforeFrame'] = (n, ...args) =>
        this._logSystem.warnBeforeFrame(n, ...args);
    errorBeforeFrame: I_LogSystem['errorBeforeFrame'] = (n, ...args) =>
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
                this.trace(`${system.typeString}.early`, () => {
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
                this.trace(`${system.typeString}.late`, () => {
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
            const forceRender = this.#forceRender;
            if (forceRender || this.#forceRenderCameras.size > 0) {
                // Only clear the canvas if we are forcing a full render
                if (forceRender) {
                    for (const canvas of Object.values(this._canvases)) {
                        const ctx = canvas?.getContext('2d');
                        if (canvas && ctx) {
                            ctx.fillStyle = this._options.canvasClearColor;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                        }
                    }
                }

                for (const cameraSystem of Object.values(this._cameraSystems)) {
                    if (
                        forceRender ||
                        this.#forceRenderCameras.has(cameraSystem.id)
                    ) {
                        cameraSystem.render();
                    }
                }

                this.#forceRender = false;
                this.#forceRenderCameras.clear();
            }
        });

        if (systemLateUpdated) {
            this.#forceRender = true;
        }

        this.#frameCount++;

        this._options.onReadyForNextFrame?.(this.#boundEngineLoop);
    }

    #handleBrowserWindowEvent(
        event: BrowserWindowEvent,
        data: BrowserEventMap[BrowserWindowEvent],
    ): boolean {
        let preventDefault = false;
        this.#browserWindowEventHandlers[event]?.forEach((handler) => {
            const result = handler(event, data);
            if (result === true) {
                preventDefault = true;
            }
        });

        return preventDefault;
    }

    #handleBrowserCanvasEvent(
        event: BrowserCanvasEvent,
        canvasID: string,
        data: BrowserEventMap[BrowserCanvasEvent],
    ): boolean {
        let preventDefault = false;

        this.#browserCanvasEventHandlers[event]?.forEach((handler) => {
            const result = handler(event, canvasID, data);
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

    #applyOptions(newOptions: Partial<TOptions>): void {
        this._options = { ...this._options, ...newOptions };

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

        if (newOptions.debugOverlay !== undefined) {
            const overlayEnabled =
                Boolean(newOptions.debugOverlay) ||
                (newOptions.debugOverlay as DebugOverlayFlags) !==
                    DebugOverlayFlags.NONE;
            if (overlayEnabled) {
                const flags =
                    typeof newOptions.debugOverlay === 'number'
                        ? newOptions.debugOverlay
                        : DebugOverlayFlags.STATS_FPS;
                this.enableDebugOverlay(flags);
            } else {
                this.disableDebugOverlay();
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

        if (
            newOptions.cameras !== undefined ||
            newOptions.cameraOptions !== undefined
        ) {
            const newCameraIDs = Array.from(Object.keys(this._options.cameras));
            const newCameraIDSet = new Set(newCameraIDs);
            const existingCameraIDs = new Set(Object.keys(this._cameraSystems));
            this.#primaryCameraID = null;

            // find primary camera in new cameras
            for (const cameraID in this._options.cameras) {
                if (this._options.cameras[cameraID].primary) {
                    this.#primaryCameraID = cameraID;
                    break;
                }
            }
            if (!this.#primaryCameraID && newCameraIDSet.size > 0) {
                this.#primaryCameraID = Array.from(newCameraIDSet)[0];
            }

            for (const cameraID in this._options.cameras) {
                if (!(cameraID in this._cameraSystems)) {
                    this._cameraSystems[cameraID] = new CameraSystem(
                        this,
                        cameraID,
                    );
                }

                const options = this._options.cameras[cameraID];
                this._cameraSystems[cameraID].applyOptions({
                    ...this._options.cameraOptions,
                    ...options,
                    primary: cameraID === this.#primaryCameraID,
                });
            }

            for (const cameraID of existingCameraIDs) {
                if (!newCameraIDSet.has(cameraID)) {
                    const system = this._cameraSystems[cameraID];
                    system.destroy();
                    delete this._cameraSystems[cameraID];
                }
            }
        }
    }

    #setRandomSeed(seed: number): void {
        this.#prng = generatePRNG(seed);
    }

    #getPrimaryCameraID(): string {
        return this.#primaryCameraID !== null
            ? this.#primaryCameraID
            : DEFAULT_CAMERA_ID;
    }
}
