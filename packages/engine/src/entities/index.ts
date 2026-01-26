import type { C_Collider } from '../components/colliders';
import {
    type Component,
    type ComponentConstructor,
    type ComponentJSON,
    type CustomComponentJSON,
} from '../components/factory';
import type { C_Rigidbody } from '../components/rigidbody';
import type { C_Transform } from '../components/transforms';
import { type Engine } from '../engine';
import type { BoundingBox } from '../math/boundingBox';
import {
    type IVector,
    type ImmutableVector,
    Vector,
    type VectorConstructor,
} from '../math/vector';
import type { CameraSystem } from '../systems/camera';
import type { RenderCommandStream } from '../systems/render/command';
import {
    type CollisionContact,
    type OneAxisAlignment,
    type Renderable,
} from '../types';
import { zoomToScale } from '../utils';
import {
    type CustomEntityJSON,
    type EntityConstructor,
    type EntityJSON,
} from './factory';

type CullMode = 'components' | 'children' | 'all' | 'none';
type PositionRelativeToCamera = OneAxisAlignment | 'none';

export interface EntityOptions {
    name?: string;
    enabled?: boolean;
    zIndex?: number;
    opacity?: number;
    cull?: CullMode;
    position?: number | IVector<number> | Vector;
    scale?: number | IVector<number> | Vector;
    rotation?: number;
    positionRelativeToCamera?: VectorConstructor<PositionRelativeToCamera>;
    scaleRelativeToCamera?: VectorConstructor<boolean>;
    rotateRelativeToCamera?: boolean;
    scene?: string;
    components?: ComponentJSON[];
    children?: EntityJSON[];

    rigidbody?: boolean;
    mass?: number;
    kinematic?: boolean;
    velocity?: VectorConstructor;
    force?: VectorConstructor;
    gravityScale?: VectorConstructor;
    bounce?: number;
}

export interface InternalEntityOptions<TEngine extends Engine = Engine>
    extends EntityOptions {
    engine: TEngine;
    parent: Entity<TEngine> | null;
}

export class Entity<TEngine extends Engine = Engine> implements Renderable {
    protected static _nextId: number = 1;
    protected readonly _id: string = (Entity._nextId++).toString();

    protected readonly _name: string;
    protected _engine: TEngine;

    protected _enabled: boolean;
    protected _zIndex: number;
    protected _opacity: number;

    protected _transform: C_Transform<TEngine>;
    protected _collider: C_Collider<TEngine> | null = null;
    protected _rigidbody: C_Rigidbody<TEngine> | null = null;

    protected _positionRelativeToCamera: IVector<PositionRelativeToCamera>;
    protected _scaleRelativeToCamera: IVector<boolean>;
    protected _rotateRelativeToCamera: boolean;
    protected _cull: CullMode;

    protected _updated: boolean = false;
    protected _parent: Entity<TEngine> | null = null;

    protected _children: Entity<TEngine>[] = [];
    #childColliderCount: number = 0;
    #childrenZIndexDirty: boolean = false;

    protected _components: Component<TEngine>[] = [];
    protected _visualComponents: Component<TEngine>[] = [];
    #componentsZIndexDirty: boolean = false;

    protected _cachedComponentsInTree: Record<string, Component[]> = {};

    constructor(options: EntityOptions) {
        const {
            name = `entity-${this._id}`,
            engine,
            parent,
            ...rest
        } = options as InternalEntityOptions<TEngine>;
        this._name = name;
        this._engine = engine;
        this._parent = parent ?? null;
        if (parent) {
            parent.registerChild(this);
        }

        this._enabled = rest?.enabled ?? true;
        this._zIndex = rest?.zIndex ?? 0;
        this._opacity = rest?.opacity ?? 1;

        this._positionRelativeToCamera = rest?.positionRelativeToCamera
            ? typeof rest.positionRelativeToCamera === 'string'
                ? {
                      x: rest.positionRelativeToCamera,
                      y: rest.positionRelativeToCamera,
                  }
                : rest.positionRelativeToCamera
            : { x: 'none', y: 'none' };
        this._scaleRelativeToCamera = rest?.scaleRelativeToCamera
            ? typeof rest.scaleRelativeToCamera === 'boolean'
                ? {
                      x: rest.scaleRelativeToCamera,
                      y: rest.scaleRelativeToCamera,
                  }
                : rest.scaleRelativeToCamera
            : { x: false, y: false };
        this._rotateRelativeToCamera =
            rest?.rotateRelativeToCamera !== undefined
                ? Boolean(rest.rotateRelativeToCamera)
                : Boolean(
                      this._scaleRelativeToCamera.x ||
                          this._scaleRelativeToCamera.y,
                  );

        this._cull = rest?.cull ?? 'all';

        if (rest.components) {
            this.addComponents(...rest.components);
        }
        if (rest.children) {
            this.addChildren(...rest.children);
        }

        this._transform = this.addComponent<C_Transform<TEngine>>({
            type: 'transform',
            position: rest?.position ?? 0,
            rotation: rest?.rotation ?? 0,
            scale: rest?.scale ?? 1,
        });

        const {
            rigidbody,
            mass,
            kinematic,
            velocity,
            force,
            gravityScale,
            bounce,
        } = options;
        const rigidbodyPropSet = Boolean(
            mass !== undefined ||
                kinematic !== undefined ||
                velocity !== undefined ||
                force !== undefined ||
                gravityScale !== undefined ||
                bounce !== undefined,
        );
        if (rigidbody || (rigidbodyPropSet && rigidbody !== false)) {
            this.setRigidbody({
                type: 'rigidbody',
                mass,
                kinematic,
                velocity,
                force,
                gravityScale,
                bounce,
            });
        }
    }

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get engine(): Engine {
        return this._engine;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    get transform(): C_Transform<TEngine> {
        return this._transform;
    }

    get collider(): C_Collider<TEngine> | null {
        return this._collider;
    }

    get rigidbody(): C_Rigidbody<TEngine> | null {
        return this._rigidbody;
    }

    get childColliderCount(): number {
        return this.#childColliderCount;
    }

    get position(): ImmutableVector {
        return this._transform.position;
    }

    get worldPosition(): ImmutableVector {
        return this._transform.worldPosition;
    }

    get scale(): ImmutableVector {
        return this._transform.scale;
    }

    get rotation(): number {
        return this._transform.rotation;
    }

    get zIndex(): number {
        return this._zIndex;
    }

    get opacity(): number {
        return this._opacity;
    }

    get cull(): CullMode {
        return this._cull;
    }

    set componentsZIndexDirty(dirty: boolean) {
        this.#componentsZIndexDirty = dirty;
    }

    set childrenZIndexDirty(dirty: boolean) {
        this.#childrenZIndexDirty = dirty;
    }

    get components(): ReadonlyArray<Component<TEngine>> {
        return this._components as Component<TEngine>[];
    }

    get visualComponents(): ReadonlyArray<Component<TEngine>> {
        return this._visualComponents as Component<TEngine>[];
    }

    get parent(): Readonly<Entity<TEngine>> | null {
        return this._parent;
    }

    get children(): ReadonlyArray<Entity<TEngine>> {
        return this._children as Entity<TEngine>[];
    }

    addChild<TCtor extends EntityConstructor>(
        child: CustomEntityJSON<TCtor>,
    ): InstanceType<TCtor>;
    addChild<IEntity extends Entity<TEngine>>(child: EntityJSON): IEntity;
    addChild<IEntity extends Entity<TEngine>>(child: EntityJSON): IEntity {
        const createdEntity = this._engine.createEntityFromJSON({
            engine: this._engine,
            parent: this,
            ...child,
        });
        this._children.push(createdEntity);

        return createdEntity as IEntity;
    }

    addChildren<TCtor extends EntityConstructor>(
        ...children: CustomEntityJSON<TCtor>[]
    ): InstanceType<TCtor>[];
    addChildren<IEntities extends Entity<TEngine>[]>(
        ...children: EntityJSON[]
    ): IEntities;
    addChildren<IEntities extends Entity<TEngine>[]>(
        ...children: EntityJSON[]
    ): IEntities {
        const createdEntities = [];
        for (const childJSON of children) {
            const entity = this._engine.createEntityFromJSON({
                engine: this._engine,
                parent: this,
                ...childJSON,
            });
            createdEntities.push(entity);
        }

        return createdEntities as IEntities;
    }

    addComponent<TCtor extends ComponentConstructor>(
        component: CustomComponentJSON<TCtor>,
    ): InstanceType<TCtor>;
    addComponent<IComponent extends Component<TEngine>>(
        component: ComponentJSON,
    ): IComponent;
    addComponent<IComponent extends Component<TEngine>>(
        component: ComponentJSON,
    ): IComponent {
        const createdComponent = this._engine.createComponentFromJSON({
            engine: this._engine,
            entity: this,
            ...component,
        });
        this.#addComponent(createdComponent);

        return createdComponent as IComponent;
    }

    addComponents<TCtor extends ComponentConstructor>(
        ...components: CustomComponentJSON<TCtor>[]
    ): InstanceType<TCtor>[];
    addComponents<IComponents extends Component<TEngine>[]>(
        ...components: ComponentJSON[]
    ): IComponents;
    addComponents<IComponents extends Component<TEngine>[]>(
        ...components: ComponentJSON[]
    ): IComponents {
        const createdComponents = [];
        for (const componentJSON of components) {
            const type = componentJSON.type;
            if (type === 'circleCollider' || type === 'rectangleCollider') {
                this.setCollider(componentJSON);
                continue;
            }

            const createdComponent = this._engine.createComponentFromJSON({
                engine: this._engine,
                entity: this,
                ...componentJSON,
            });
            createdComponents.push(createdComponent);
            this.#addComponent(createdComponent);
        }

        return createdComponents as IComponents;
    }

    setCollider<TCollider extends C_Collider<TEngine>>(
        colliderOptions: ComponentJSON | null,
    ): TCollider | null {
        const hasCollider = !!this._collider;
        if (this._collider) {
            this._collider.destroy();
            this._collider = null;
        }

        if (colliderOptions) {
            const collider = this.addComponent<TCollider>(colliderOptions);
            this._collider = collider;
            collider.rigidbody = this._rigidbody;
        }

        if (hasCollider && !this._collider) {
            this.parent?.childColliderChanged(false);
        } else if (!hasCollider && this._collider) {
            this.parent?.childColliderChanged(true);
        }

        return this._collider as TCollider | null;
    }

    setRigidbody(
        rigidbodyOptions: ComponentJSON | null,
    ): C_Rigidbody<TEngine> | null {
        if (this._rigidbody) {
            this._rigidbody.destroy();
            this._rigidbody = null;
        }

        if (rigidbodyOptions) {
            const rigidbody =
                this.addComponent<C_Rigidbody<TEngine>>(rigidbodyOptions);
            this._rigidbody = rigidbody;
        }

        if (this._collider) {
            this._collider.rigidbody = this._rigidbody;
        }

        return this._rigidbody as C_Rigidbody<TEngine> | null;
    }

    // TODO: cache or smth
    getEntityByName(name: string): Entity<TEngine> | null {
        if (this._name === name) {
            return this;
        }
        for (const child of this._children) {
            const result = child.getEntityByName(name);
            if (result) return result;
        }

        return null;
    }

    childColliderChanged(added: boolean): void {
        if (added) {
            this.#childColliderCount++;
        } else {
            this.#childColliderCount--;
        }
        this._parent?.childColliderChanged(added);
    }

    markBoundsDirty(): void {
        this.transform.markBoundsDirty();
        if (this._collider) {
            this._collider.markCollisionBoundsDirty();
        }
        if (this.parent) {
            this.parent.markBoundsDirty();
        }
    }

    registerChild(child: Entity<TEngine>): void {
        this._children.push(child);
        this.#childrenZIndexDirty = true;
    }

    getComponentsInTree<T extends Component<TEngine>>(
        ...typeStrings: string[]
    ): T[] {
        const key = typeStrings.join(',');
        if (key in this._cachedComponentsInTree) {
            return this._cachedComponentsInTree[key] as T[];
        }

        const out: T[] = [];
        this.#getComponentsInTree<T>(typeStrings, out);
        this._cachedComponentsInTree[key] = out;

        return out;
    }

    onChildComponentsOfTypeChanged(typeString: string): void {
        delete this._cachedComponentsInTree[typeString];
        if (this._parent) {
            this._parent.onChildComponentsOfTypeChanged(typeString);
        }
    }

    engineUpdate(deltaTime: number): boolean {
        let updated = this._updated;
        this._updated = false;

        for (const child of this._children) {
            if (child.enabled) {
                updated = child.engineUpdate(deltaTime) || updated;
            }
        }

        for (const component of this._components) {
            if (component.enabled) {
                updated = component.update(deltaTime) || updated;
            }
        }

        updated = this.update(deltaTime) || updated;

        return updated;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(_deltaTime: number): boolean | void {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onCollision(contact: CollisionContact<TEngine>): void {}

    destroy(): void {
        if (this._parent)
            this._parent._children = this._parent._children.filter(
                (e) => e.id !== this.id,
            );
        this.#destroy();
    }

    removeChildren(...entities: Entity[]): void {
        for (const entity of entities) {
            entity.destroy();
        }
    }

    setEnabled(enabled: boolean): this {
        if (this._enabled !== enabled) {
            this._enabled = enabled;

            for (const component of this._components) {
                component.setEnabled(enabled);
            }
            for (const child of this._children) {
                child.setEnabled(enabled);
            }
        }

        return this;
    }

    setPosition(newPosition: number | IVector<number> | Vector): this {
        this._transform.setPosition(newPosition);

        return this;
    }

    move(delta: VectorConstructor): this {
        this._transform.translate(delta);

        return this;
    }

    setScale(newScale: number | IVector<number> | Vector): this {
        this._transform.setScale(newScale);

        return this;
    }

    setRotation(newRotation: number): this {
        this._transform.setRotation(newRotation);

        return this;
    }

    scaleBy(delta: VectorConstructor): this {
        this._transform.scaleBy(delta);

        return this;
    }

    rotate(delta: number): this {
        this._transform.rotate(delta);

        return this;
    }

    setZIndex(zIndex: number): this {
        if (this._zIndex !== zIndex && !isNaN(zIndex)) {
            this._zIndex = zIndex;
            if (this._parent) {
                this._parent.childrenZIndexDirty = true;
            }
        }

        return this;
    }

    setOpacity(opacity: number): this {
        this._opacity = opacity;

        return this;
    }

    setPositionRelativeToCamera(
        positionRelativeToCamera: VectorConstructor<PositionRelativeToCamera>,
    ): this {
        this._positionRelativeToCamera =
            typeof positionRelativeToCamera === 'string'
                ? { x: positionRelativeToCamera, y: positionRelativeToCamera }
                : positionRelativeToCamera;

        return this;
    }

    setScaleRelativeToCamera(
        scaleRelativeToCamera: VectorConstructor<boolean>,
    ): this {
        this._scaleRelativeToCamera =
            typeof scaleRelativeToCamera === 'boolean'
                ? { x: scaleRelativeToCamera, y: scaleRelativeToCamera }
                : scaleRelativeToCamera;

        return this;
    }

    setRotateRelativeToCamera(
        rotateRelativeToCamera: VectorConstructor<PositionRelativeToCamera>,
    ): this {
        this._rotateRelativeToCamera = Boolean(rotateRelativeToCamera);

        return this;
    }

    setCull(cull: CullMode): this {
        this._cull = cull;
        return this;
    }

    removeComponents(...components: Component<TEngine>[]): this {
        for (const component of components) {
            const componentIndex = this._components.indexOf(component);
            if (componentIndex !== -1) {
                this._components.splice(componentIndex, 1);
            }

            if (component.isVisual()) {
                const visualIndex = this._visualComponents.indexOf(component);
                if (visualIndex !== -1) {
                    this._visualComponents.splice(visualIndex, 1);
                }
            }

            component.destroy();
            this.onChildComponentsOfTypeChanged(component.typeString);
        }

        return this;
    }

    hasComponent(component: Component<TEngine>): boolean {
        return this._components.includes(component);
    }

    getComponent(typeString: string): Component<TEngine> | null {
        return this._components.find((c) => c.name === typeString) ?? null;
    }

    queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): void {
        if (
            !this._enabled ||
            this._children.length + this._components.length === 0
        ) {
            return;
        }

        // Apply camera scaling only if we need to render
        if (this._scaleRelativeToCamera.x || this._scaleRelativeToCamera.y) {
            const scale = zoomToScale(camera.zoom);
            this.transform.setScaleMult(
                new Vector(
                    this._scaleRelativeToCamera.x ? 1 / scale : 1,
                    this._scaleRelativeToCamera.y ? 1 / scale : 1,
                ),
            );
        }

        if (
            this._positionRelativeToCamera.x !== 'none' ||
            this._positionRelativeToCamera.y !== 'none'
        ) {
            const cameraSize = camera.size;
            if (cameraSize) {
                const scale = zoomToScale(camera.zoom);

                // Calculate world center of the camera viewport
                const worldCenterOffset = {
                    x: camera.position.x / scale,
                    y: camera.position.y / scale,
                };

                // Account for camera rotation
                const rotationRad = (-camera.rotation * Math.PI) / 180;
                const cosRot = Math.cos(rotationRad);
                const sinRot = Math.sin(rotationRad);
                const worldCenterX =
                    worldCenterOffset.x * cosRot - worldCenterOffset.y * sinRot;
                const worldCenterY =
                    worldCenterOffset.x * sinRot + worldCenterOffset.y * cosRot;

                let xOffsetLocal = 0;
                let yOffsetLocal = 0;
                switch (this._positionRelativeToCamera.x) {
                    case 'start':
                        xOffsetLocal = -cameraSize.x / 2;
                        break;
                    case 'center':
                        xOffsetLocal = 0;
                        break;
                    case 'end':
                        xOffsetLocal = cameraSize.x / 2;
                        break;
                }
                switch (this._positionRelativeToCamera.y) {
                    case 'start':
                        yOffsetLocal = -cameraSize.y / 2;
                        break;
                    case 'center':
                        yOffsetLocal = 0;
                        break;
                    case 'end':
                        yOffsetLocal = cameraSize.y / 2;
                        break;
                }

                const xOffsetWorld =
                    xOffsetLocal * cosRot - yOffsetLocal * sinRot;
                const yOffsetWorld =
                    xOffsetLocal * sinRot + yOffsetLocal * cosRot;

                this.transform.setPositionOffset({
                    x:
                        this._positionRelativeToCamera.x !== 'none'
                            ? worldCenterX +
                              xOffsetWorld -
                              this.position.x +
                              this.position.x * this.transform.scaleMult.x
                            : 0,
                    y:
                        this._positionRelativeToCamera.y !== 'none'
                            ? worldCenterY +
                              yOffsetWorld -
                              this.position.y +
                              this.position.y * this.transform.scaleMult.y
                            : 0,
                });
            }
        }

        if (this._rotateRelativeToCamera) {
            this.transform.setRotationOffset(-camera.rotation);
        }

        const culled =
            this._cull !== 'none' && this.isCulled(camera.cullBoundingBox);
        if (culled && this._cull === 'all') {
            return;
        }

        const cullChildren = culled && this._cull === 'children';
        const cullComponents = culled && this._cull === 'components';

        if (this.#childrenZIndexDirty && !cullChildren) {
            this.#sortChildren();
            this.#childrenZIndexDirty = false;
        }
        if (this.#componentsZIndexDirty && !cullComponents) {
            this.#sortComponents();
            this.#componentsZIndexDirty = false;
        }

        stream.pushTransform(this._transform.localMatrix);

        if (!cullChildren) {
            // Negative z-index children first
            for (const child of this._children) {
                if (child.zIndex < 0 && child.enabled) {
                    child.queueRenderCommands(stream, camera);
                }
            }
        }

        if (!cullComponents) {
            // Then components
            for (const component of this._components) {
                if (component.enabled) {
                    component.queueRenderCommands(stream, camera);
                }
            }
        }

        if (!cullChildren) {
            // Then non-negative z-index children
            for (const child of this._children) {
                if (child.zIndex >= 0 && child.enabled) {
                    child.queueRenderCommands(stream, camera);
                }
            }
        }

        stream.popTransform();
    }

    isCulled(cameraBoundingBox: BoundingBox): boolean {
        return !cameraBoundingBox.intersects(this.transform.boundingBox);
    }

    isVisual(): boolean {
        return this._visualComponents.length > 0;
    }

    #destroy(): void {
        for (const child of this._children) {
            child.#destroy();
        }
        for (const component of this._components) {
            component.destroy();
        }

        this._children = [];
        this._components = [];
        this._parent = null;
    }

    #sortByZIndex<T extends { zIndex: number; id: string }>(
        a: T,
        b: T,
    ): number {
        const zDiff = a.zIndex - b.zIndex;
        if (zDiff !== 0) {
            return zDiff;
        }

        return a.id > b.id ? 1 : -1;
    }

    #sortChildren(): void {
        this._children.sort(this.#sortByZIndex);
        for (const child of this._children) {
            child.#sortChildren();
        }
    }

    #addComponent(component: Component<TEngine>): void {
        this._components.push(component);
        if (component.isVisual()) {
            this._visualComponents.push(component);
        }
        this.onChildComponentsOfTypeChanged(component.typeString);
    }

    #sortComponents(): void {
        this._components.sort(this.#sortByZIndex);
    }

    #getComponentsInTree<T extends Component<TEngine>>(
        typeStrings: string[],
        out: T[],
    ): void {
        if (!this.enabled) {
            return;
        }

        for (const child of this._children) {
            child.#getComponentsInTree(typeStrings, out);
        }

        for (const comp of this._components) {
            if (comp.enabled && typeStrings.includes(comp.typeString)) {
                out.push(comp as T);
            }
        }
    }
}
