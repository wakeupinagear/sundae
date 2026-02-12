import type { Engine } from '../../engine';
import { type Entity } from '../../entities';
import {
    type BaseEntityJSON,
    type CustomEntityJSON,
    type EntityConstructor,
    type EntityJSON,
    type StringEntityJSON,
} from '../../entities/factory';
import { System } from '../index';

type TypedEntityJSON = Extract<StringEntityJSON, { type: string }>;
// Utility to get all keys from all members of a union.
// (Plain `keyof (A | B)` gives you the intersection of keys, which is too weak
// for enforcing "no typed-only keys unless `type` is provided".)
type UnionKeys<T> = T extends unknown ? keyof T : never;
type BaseEntityInput = BaseEntityJSON & {
    [K in Exclude<UnionKeys<TypedEntityJSON>, keyof BaseEntityJSON>]?: never;
};

export interface SceneOptions<TEngine extends Engine = Engine> {
    engine: TEngine;
    name?: string;
    zIndex?: number;
}

export class Scene<TEngine extends Engine = Engine> {
    protected static _nextId: number = 1;
    protected readonly _id: number = Scene._nextId++;
    protected readonly _name: string;

    protected _engine: TEngine;
    #rootEntity!: Entity<TEngine>;
    #zIndex: number = 0;

    constructor(options: SceneOptions<TEngine>) {
        const { engine, name, zIndex = 0 } = options;
        this._engine = engine;
        this._name = name || `scene-${this._id}`;
        this.#zIndex = zIndex;
    }

    get id(): number {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get zIndex(): number {
        return this.#zIndex;
    }

    set zIndex(zIndex: number) {
        if (this.#zIndex !== zIndex && !isNaN(zIndex)) {
            this.#zIndex = zIndex;

            this.#rootEntity.setZIndex(zIndex);
        }
    }

    get engine(): Engine {
        return this._engine;
    }

    get rootEntity(): Readonly<Entity<TEngine>> {
        return this.#rootEntity;
    }

    set rootEntity(rootEntity: Entity<TEngine>) {
        this.#rootEntity = rootEntity;
    }

    createEntity(entity: BaseEntityInput): Entity<TEngine>;
    createEntity(entity: TypedEntityJSON): Entity<TEngine>;
    createEntity<TCtor extends EntityConstructor>(
        entity: CustomEntityJSON<TCtor>,
    ): InstanceType<TCtor>;
    createEntity(
        entity: EntityJSON | CustomEntityJSON<EntityConstructor>,
    ): Entity<TEngine> {
        return this._engine.createEntitiesWithParent(
            [entity],
            this.#rootEntity,
        )[0];
    }

    createEntities(...entities: BaseEntityInput[]): Entity<TEngine>[];
    createEntities(...entities: TypedEntityJSON[]): Entity<TEngine>[];
    createEntities<TCtor extends EntityConstructor>(
        ...entities: CustomEntityJSON<TCtor>[]
    ): InstanceType<TCtor>[];
    createEntities(
        ...entities: Array<EntityJSON | CustomEntityJSON<EntityConstructor>>
    ): Entity<TEngine>[] {
        return this._engine.createEntitiesWithParent(
            entities,
            this.#rootEntity,
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    create(_engine: TEngine, ..._args: unknown[]): void {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(_deltaTime: number): boolean | void {}

    destroy(): void {}
}

export type SceneIdentifier<TEngine extends Engine = Engine> =
    | Scene<TEngine>
    | string
    | number
    | null;

export class SceneSystem<
    TEngine extends Engine = Engine,
> extends System<TEngine> {
    public static typeString: string = 'SceneSystem';

    #queuedNewScenes: Array<{
        scene: Scene<TEngine>;
        createArgs: unknown[];
        initialEntities: EntityJSON[];
    }> = [];
    #activeScenesByID: Map<number, Scene<TEngine>> = new Map();
    #activeScenesByName: Map<string, Scene<TEngine>> = new Map();
    #defaultScene: Scene<TEngine> | null = null;

    #queuedDestroyedScenes: Scene<TEngine>[] = [];
    #isLoadingQueuedScenes: boolean = false;

    #sceneRootEntities: Map<number, Entity<TEngine>> = new Map();

    constructor(engine: TEngine) {
        super(engine);
    }

    override get typeString(): string {
        return SceneSystem.typeString;
    }

    get queuedActionsExist(): boolean {
        return (
            this.#queuedNewScenes.length > 0 ||
            this.#queuedDestroyedScenes.length > 0
        );
    }

    override earlyUpdate(deltaTime: number): boolean {
        let updated = this.#performQueuedUpdate();

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [_, scene] of this.#activeScenesByID) {
            updated = scene.update(deltaTime) || updated;
        }

        return updated;
    }

    destroy(): void {
        this.#queuedNewScenes = [];
        this.#activeScenesByID.clear();
        this.#activeScenesByName.clear();
        this.#defaultScene = null;
        this.#queuedDestroyedScenes = [];
    }

    openScene(
        scene: Scene<TEngine>,
        createArgs: unknown[] = [],
        initialEntities: EntityJSON[] = [],
    ): void {
        this.#queuedNewScenes.push({ scene, createArgs, initialEntities });
    }

    closeScene(scene: SceneIdentifier<TEngine>): void {
        const sceneObject = this.#findScene(scene);
        if (!sceneObject) {
            return;
        }

        this.#activeScenesByID.delete(sceneObject.id);
        this.#activeScenesByName.delete(sceneObject.name);
        this.#queuedDestroyedScenes.push(sceneObject);
    }

    #findScene(scene: SceneIdentifier<TEngine>): Scene<TEngine> | null {
        if (this.queuedActionsExist && !this.#isLoadingQueuedScenes) {
            this.#performQueuedUpdate();
        }

        return (
            (!scene
                ? this.#defaultScene
                : typeof scene === 'string'
                  ? this.#activeScenesByName.get(scene)
                  : typeof scene === 'number'
                    ? this.#activeScenesByID.get(scene)
                    : scene) || this.#defaultScene
        );
    }

    #makeSceneActive(
        scene: Scene<TEngine>,
        createArgs: unknown[] = [],
        initialEntities: EntityJSON[] = [],
    ): void {
        this.#activeScenesByID.set(scene.id, scene);
        this.#activeScenesByName.set(scene.name, scene);

        const rootEntity = this._engine.createEntities({
            type: 'entity',
            name: `scene-root-${scene.name}-${scene.id}`,
            zIndex: scene.zIndex,
            cull: 'none',
        })[0];
        this.#sceneRootEntities.set(scene.id, rootEntity);
        if (!this.#defaultScene) {
            this.#defaultScene = scene;
        }

        scene.rootEntity = rootEntity;
        (scene.create as (engine: TEngine, ...args: unknown[]) => void)(
            this._engine,
            ...createArgs,
        );

        if (initialEntities.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            scene.createEntities(...(initialEntities as any));
        }
    }

    #performQueuedUpdate(): boolean {
        let updated = false;
        this.#isLoadingQueuedScenes = true;

        while (this.#queuedNewScenes.length > 0) {
            const newScenes = [...this.#queuedNewScenes];
            // Allows new scenes to be opened by a scene's create method
            this.#queuedNewScenes = [];
            for (const { scene, createArgs, initialEntities } of newScenes) {
                this.#makeSceneActive(scene, createArgs, initialEntities);
            }
            updated = true;
        }

        for (const scene of this.#queuedDestroyedScenes) {
            scene.destroy();
            const rootEntity = this.#sceneRootEntities.get(scene.id);
            if (rootEntity) {
                rootEntity.destroy();
            }
            updated = true;
        }
        this.#queuedDestroyedScenes = [];
        this.#isLoadingQueuedScenes = false;

        return updated;
    }
}
