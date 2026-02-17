import type { C_CircleJSON } from '../components/circle';
import type { C_Collider } from '../components/colliders';
import {
    type Component,
    type ComponentConstructor,
    type ComponentJSON,
    type CustomComponentJSON,
    type StringComponentJSON,
} from '../components/factory';
import type { C_ImageJSON } from '../components/image';
import type { C_LineJSON } from '../components/line';
import type { C_RectangleJSON } from '../components/rectangle';
import type { C_Rigidbody } from '../components/rigidbody';
import type { C_Transform } from '../components/transforms';
import { type Engine } from '../engine';
import type { BoundingBox } from '../math/boundingBox';
import type { Matrix2D } from '../math/matrix';
import {
    type IVector,
    type ImmutableVector,
    Vector,
    type VectorConstructor,
} from '../math/vector';
import type { CameraSystem } from '../systems/camera';
import type { RenderCommandStream } from '../systems/render/command';
import type { ISignalSubscriber, OnSignalUpdatedCB } from '../systems/signal';
import {
    type CollisionContact,
    ComponentAppearance,
    type IRenderable,
    type OneAxisAlignment,
} from '../types';
import { OPACITY_THRESHOLD } from '../utils';
import {
    type CustomEntityJSON,
    type EntityConstructor,
    type EntityJSON,
    type StringEntityJSON,
} from './factory';

type CullMode = 'components' | 'children' | 'all' | 'none';
type PositionRelativeToCamera = OneAxisAlignment | 'none';
export type LayoutMode = 'row' | 'column';

type BackgroundOptions =
    | boolean
    | string
    | C_CircleJSON
    | C_RectangleJSON
    | C_LineJSON
    | C_ImageJSON;

type BackgroundConstructor = BackgroundOptions | BackgroundOptions[];

interface LODOptions {
    minZoom?: number;
    maxZoom?: number;
    fadeThreshold?: number;
}

export interface EntityOptions {
    name?: string;
    enabled?: boolean;
    zIndex?: number;
    hoverZIndex?: number;
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
    layoutMode?: LayoutMode;
    gap?: VectorConstructor;
    background?: BackgroundConstructor;
    lod?: LODOptions;

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

export class Entity<TEngine extends Engine = Engine> implements IRenderable {
    protected static _nextId: number = 1;
    protected readonly _id: string = (Entity._nextId++).toString();

    protected readonly _name: string;
    protected _engine: TEngine;

    protected _enabled: boolean;

    protected _zIndex: number;
    protected _hoverZIndex: number;
    #computedZIndex: number;

    protected _opacity: number;

    protected _transform: C_Transform<TEngine>;
    protected _collider: C_Collider<TEngine> | null = null;
    protected _rigidbody: C_Rigidbody<TEngine> | null = null;

    protected _positionRelativeToCamera: IVector<PositionRelativeToCamera>;
    protected _scaleRelativeToCamera: IVector<boolean>;
    protected _rotateRelativeToCamera: boolean;
    protected _cull: CullMode;
    protected _layoutMode: LayoutMode | null;
    protected _gap: number;

    protected _updated: boolean = false;
    protected _parent: Entity<TEngine> | null = null;

    protected _children: Entity<TEngine>[] = [];
    #childColliderCount: number = 0;
    #childrenZIndexDirty: boolean = false;

    protected _components: Component<TEngine>[] = [];
    #componentsZIndexDirty: boolean = false;

    protected _foregroundComponents: Component<TEngine>[] = [];
    protected _backgroundComponents: Component<TEngine>[] = [];
    #componentAppearancesDirty: boolean = false;

    protected _cachedComponentsInTree: Record<string, Component[]> = {};

    protected _lod: LODOptions | null = null;

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
        this._hoverZIndex = rest?.hoverZIndex ?? 0;
        this.#computedZIndex = this._zIndex;
        this._opacity = rest?.opacity ?? 1;

        this._positionRelativeToCamera = rest?.positionRelativeToCamera
            ? typeof rest.positionRelativeToCamera === 'string'
                ? {
                      x: rest.positionRelativeToCamera,
                      y: rest.positionRelativeToCamera,
                  }
                : rest.positionRelativeToCamera
            : { x: 'none', y: 'none' };
        const isPositionScaled =
            this._positionRelativeToCamera.x !== 'none' ||
            this._positionRelativeToCamera.y !== 'none';
        this._scaleRelativeToCamera =
            rest?.scaleRelativeToCamera !== undefined
                ? typeof rest.scaleRelativeToCamera === 'boolean'
                    ? {
                          x: rest.scaleRelativeToCamera,
                          y: rest.scaleRelativeToCamera,
                      }
                    : rest.scaleRelativeToCamera
                : {
                      x: isPositionScaled,
                      y: isPositionScaled,
                  };
        this._rotateRelativeToCamera =
            rest?.rotateRelativeToCamera !== undefined
                ? Boolean(rest.rotateRelativeToCamera)
                : isPositionScaled;

        this._cull = rest?.cull ?? 'all';
        this._layoutMode = rest?.layoutMode ?? null;
        this._gap = this.#normalizeLayoutGap(rest?.gap);

        this._transform = this.addComponent<C_Transform<TEngine>>({
            type: 'transform',
            position: rest?.position ?? 0,
            rotation: rest?.rotation ?? 0,
            scale: rest?.scale ?? 1,
        });

        if (rest.components) {
            this.addComponents(...rest.components);
        }
        if (rest.children) {
            this.addChildren(...rest.children);
        }

        if (rest.background) {
            this.setBackground(rest.background);
        }

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

        if (rest.lod) {
            this._lod = rest.lod;
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

    get boundingBox(): BoundingBox {
        return this._transform.boundingBox;
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
        return this.#computedZIndex;
    }

    get opacity(): number {
        return this._opacity;
    }

    get cull(): CullMode {
        return this._cull;
    }

    get layoutMode(): LayoutMode | null {
        return this._layoutMode;
    }

    get gap(): number {
        return this._gap;
    }

    set componentsZIndexDirty(dirty: boolean) {
        this.#componentsZIndexDirty = dirty;
    }

    set componentAppearancesDirty(dirty: boolean) {
        this.#componentAppearancesDirty = dirty;
        this._transform.markBoundsDirty();
    }

    set childrenZIndexDirty(dirty: boolean) {
        this.#childrenZIndexDirty = dirty;
    }

    get components(): ReadonlyArray<Component<TEngine>> {
        return this._components;
    }

    get foregroundComponents(): ReadonlyArray<Component<TEngine>> {
        if (this.#componentAppearancesDirty) {
            this.#processComponentAppearanceChanges();
            this.#componentAppearancesDirty = false;
        }

        return this._foregroundComponents;
    }

    get backgroundComponents(): ReadonlyArray<Component<TEngine>> {
        if (this.#componentAppearancesDirty) {
            this.#processComponentAppearanceChanges();
            this.#componentAppearancesDirty = false;
        }

        return this._backgroundComponents;
    }

    get parent(): Readonly<Entity<TEngine>> | null {
        return this._parent;
    }

    get children(): ReadonlyArray<Entity<TEngine>> {
        return this._children as Entity<TEngine>[];
    }

    get scaleRelativeToCamera(): IVector<boolean> {
        return this._scaleRelativeToCamera;
    }

    get positionRelativeToCamera(): IVector<PositionRelativeToCamera> {
        return this._positionRelativeToCamera;
    }

    get lod(): LODOptions | null {
        return this._lod;
    }

    addChild<TCtor extends EntityConstructor>(
        child: CustomEntityJSON<TCtor>,
    ): InstanceType<TCtor>;
    addChild<IEntity extends Entity<TEngine>>(child: StringEntityJSON): IEntity;
    addChild<IEntity extends Entity<TEngine>>(
        child: StringEntityJSON,
    ): IEntity {
        const createdEntity = this._engine.createEntityFromJSON({
            engine: this._engine,
            parent: this,
            ...child,
        });

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
            if (!childJSON || typeof childJSON === 'boolean') continue;

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
        component: StringComponentJSON,
    ): IComponent;
    addComponent<IComponent extends Component<TEngine>>(
        component: StringComponentJSON,
    ): IComponent {
        const createdComponent = this._engine.createComponentFromJSON({
            engine: this._engine,
            entity: this,
            zIndex: 1,
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
            if (!componentJSON || typeof componentJSON === 'boolean') continue;

            const type = componentJSON.type;
            if (type === 'circleCollider' || type === 'rectangleCollider') {
                this.setCollider(componentJSON);
                continue;
            }

            const createdComponent = this.addComponent(componentJSON);
            createdComponents.push(createdComponent);
        }

        return createdComponents as IComponents;
    }

    getSignalValue: ISignalSubscriber['getSignalValue'] = (
        signalName,
        fallback,
        format,
    ) => {
        return this._engine.getSignalValue(signalName, fallback, format);
    };

    subscribeToSignal(signalName: string, cb: OnSignalUpdatedCB) {
        this._engine.subscribeToSignal(this._id, signalName, cb);
    }

    unsubscribeFromSignal(signalName: string) {
        this._engine.unsubscribeFromSignal(this._id, signalName);
    }

    unsubscribeFromAllSignals() {
        this._engine.unsubscribeFromAllSignals(this._id);
    }

    setBackground(
        background: BackgroundConstructor | null,
    ): ReadonlyArray<Component<TEngine>> {
        return this.#setBackground(background);
    }

    setCollider<TCollider extends C_Collider<TEngine>>(
        colliderOptions: ComponentJSON,
    ): TCollider | null {
        const hasCollider = !!this._collider;
        if (this._collider) {
            this._collider.destroy();
            this._collider = null;
        }

        if (colliderOptions && typeof colliderOptions !== 'boolean') {
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

        if (rigidbodyOptions && typeof rigidbodyOptions !== 'boolean') {
            const rigidbody =
                this.addComponent<C_Rigidbody<TEngine>>(rigidbodyOptions);
            this._rigidbody = rigidbody;
        }

        if (this._collider) {
            this._collider.rigidbody = this._rigidbody;
        }

        return this._rigidbody as C_Rigidbody<TEngine> | null;
    }

    setLOD(lod: LODOptions): this {
        this._lod = lod;
        return this;
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

    onPointerEnter(): void {
        this.#computeZIndex(true);
        for (const comp of this._components) {
            if (comp.enabled) {
                comp.onPointerEnter();
            }
        }
    }

    onPointerStay(): void {
        for (const comp of this._components) {
            if (comp.enabled) {
                comp.onPointerStay();
            }
        }
    }

    onPointerLeave(): void {
        this.#computeZIndex(false);
        for (const comp of this._components) {
            if (comp.enabled) {
                comp.onPointerLeave();
            }
        }
    }

    applyLayoutInTree(): boolean {
        let changed = false;
        for (const child of this._children) {
            changed = child.applyLayoutInTree() || changed;
        }

        if (this._layoutMode) {
            changed = this.#applyLayout() || changed;
        }

        return changed;
    }

    engineUpdate(deltaTime: number): boolean {
        let updated = this._updated;
        this._updated = false;

        if (this._layoutMode) {
            updated = this.#applyLayout() || updated;
        }

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
        if (this._layoutMode) {
            updated = this.#applyLayout() || updated;
        }

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
            this.#computeZIndex();
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

    setLayoutMode(layoutMode: LayoutMode | null): this {
        this._layoutMode = layoutMode;
        return this;
    }

    setGap(gap: VectorConstructor): this {
        this._gap = this.#normalizeLayoutGap(gap);
        return this;
    }

    removeComponents(...components: Component<TEngine>[]): this {
        for (const component of components) {
            const componentIndex = this._components.indexOf(component);
            if (componentIndex !== -1) {
                this._components.splice(componentIndex, 1);
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

        let opacityOverride = 1;
        if (this._lod) {
            const {
                maxZoom = Infinity,
                minZoom = -Infinity,
                fadeThreshold = 0,
            } = this._lod;
            if (camera.zoom > maxZoom || camera.zoom < minZoom) {
                return;
            }

            if (fadeThreshold >= 0 && this._opacity >= OPACITY_THRESHOLD) {
                const zoom = camera.zoom;
                const fadeRadius = Math.abs(fadeThreshold);
                if (fadeRadius > 0) {
                    if (Number.isFinite(minZoom)) {
                        opacityOverride = Math.min(
                            Math.abs(zoom - minZoom),
                            opacityOverride,
                        );
                    }
                    if (Number.isFinite(maxZoom)) {
                        opacityOverride = Math.min(
                            Math.abs(zoom - maxZoom),
                            opacityOverride,
                        );
                    }
                }
            }
        }

        if (this._scaleRelativeToCamera.x || this._scaleRelativeToCamera.y) {
            this.transform.setScaleMult(
                new Vector(
                    this._scaleRelativeToCamera.x ? 1 / camera.scaledZoom : 1,
                    this._scaleRelativeToCamera.y ? 1 / camera.scaledZoom : 1,
                ),
            );
        }

        if (
            this._positionRelativeToCamera.x !== 'none' ||
            this._positionRelativeToCamera.y !== 'none'
        ) {
            this.#syncRelativePositionToCamera(camera);
        }

        if (this._rotateRelativeToCamera) {
            this.transform.setRotationOffset(-camera.rotation);
        }

        const culled = this._cull !== 'none' && this.isCulled(camera);
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

        if (this._opacity >= OPACITY_THRESHOLD) {
            stream.pushTransform(this._transform.localMatrix);

            const opacity = this._opacity * opacityOverride;
            const opacityNotOne = opacity <= 1 - OPACITY_THRESHOLD;
            if (opacityNotOne) {
                stream.pushOpacity(opacity);
            }

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

            if (opacityNotOne) {
                stream.popOpacity();
            }

            stream.popTransform();
        }
    }

    isCulled(camera: CameraSystem): boolean {
        if (
            !camera.cullBoundingBox.intersects(this.transform.boundingBox) ||
            this.isLODCulled(camera)
        ) {
            return true;
        }

        return false;
    }

    isLODCulled(camera: CameraSystem): boolean {
        if (this._lod) {
            const lod = this._lod;
            if (
                camera.zoom > (lod.maxZoom ?? Infinity) ||
                camera.zoom < (lod.minZoom ?? -Infinity)
            ) {
                return true;
            }
        }

        return false;
    }

    isVisual(): boolean {
        return (
            this._foregroundComponents.length +
                this._backgroundComponents.length >
            0
        );
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

        const aId = Number(a.id);
        const bId = Number(b.id);
        if (!Number.isNaN(aId) && !Number.isNaN(bId)) {
            return aId - bId;
        }

        return a.id.localeCompare(b.id);
    }

    #sortChildren(): void {
        this._children.sort(this.#sortByZIndex);
        for (const child of this._children) {
            child.#sortChildren();
        }
    }

    #addComponent(comp: Component<TEngine>): void {
        this._components.push(comp);
        this.#componentsZIndexDirty = true;
        this.onChildComponentsOfTypeChanged(comp.typeString);
        this.#processComponentAppearance(comp);
    }

    #sortComponents(): void {
        this._components.sort(this.#sortByZIndex);
    }

    #processComponentAppearance(comp: Component<TEngine>): void {
        if (comp.appearance === ComponentAppearance.FOREGROUND) {
            this._foregroundComponents.push(comp);
        } else if (comp.appearance === ComponentAppearance.BACKGROUND) {
            this._backgroundComponents.push(comp);
        }
    }

    #processComponentAppearanceChanges() {
        this._foregroundComponents = [];
        this._backgroundComponents = [];
        for (const comp of this._components) {
            this.#processComponentAppearance(comp);
        }
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

    #syncRelativePositionToCamera(camera: CameraSystem): void {
        const cameraSize = camera.size;
        if (cameraSize) {
            const scale = camera.scaledZoom;

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
                    xOffsetLocal = -cameraSize.x / 2 - scale;
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
                    yOffsetLocal = -cameraSize.y / 2 - scale;
                    break;
                case 'center':
                    yOffsetLocal = 0;
                    break;
                case 'end':
                    yOffsetLocal = cameraSize.y / 2;
                    break;
            }

            yOffsetLocal /= scale;
            xOffsetLocal /= scale;

            const xOffsetWorld = xOffsetLocal * cosRot - yOffsetLocal * sinRot;
            const yOffsetWorld = xOffsetLocal * sinRot + yOffsetLocal * cosRot;

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

    #applyLayout(): boolean {
        const layoutMode = this._layoutMode;
        if (!layoutMode || this._children.length === 0) {
            return false;
        }

        const parentInverseWorld = this.transform.worldMatrix.inverse();
        const items = this._children.map((child) => ({
            child,
            ...this.#getChildLayoutMetrics(child, parentInverseWorld),
        }));

        const mainSizeKey = layoutMode === 'row' ? 'width' : 'height';
        const totalMainSize =
            items.reduce((acc, item) => acc + item[mainSizeKey], 0) +
            this._gap * Math.max(0, items.length - 1);

        let cursor = -totalMainSize / 2;
        let changed = false;
        for (const item of items) {
            const mainSize = item[mainSizeKey];
            const mainCenter = cursor + mainSize / 2;
            cursor += mainSize + this._gap;

            const nextPosition =
                layoutMode === 'row'
                    ? {
                          x: mainCenter - item.centerOffsetX,
                          y: -item.centerOffsetY,
                      }
                    : {
                          x: -item.centerOffsetX,
                          y: mainCenter - item.centerOffsetY,
                      };
            if (
                item.child.position.x !== nextPosition.x ||
                item.child.position.y !== nextPosition.y
            ) {
                item.child.setPosition(nextPosition);
                changed = true;
            }
        }

        return changed;
    }

    #isFillDrawable(component: Component<TEngine>): boolean {
        return (
            'fill' in component &&
            (component as { fill?: boolean }).fill === true
        );
    }

    #getChildLayoutMetrics(
        child: Entity<TEngine>,
        parentInverseWorld: Readonly<Matrix2D>,
    ): {
        width: number;
        height: number;
        centerOffsetX: number;
        centerOffsetY: number;
    } {
        const childWorld = child.transform.worldMatrix;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        const layoutComponents = [
            ...child.backgroundComponents.filter(
                (component) => !this.#isFillDrawable(component),
            ),
            ...child.foregroundComponents,
        ];
        const shouldIncludeEntityBounds = child.backgroundComponents.some(
            (component) => this.#isFillDrawable(component),
        );

        if (layoutComponents.length > 0) {
            for (const component of layoutComponents) {
                const bb = component.boundingBox;
                const componentCorners = [
                    { x: bb.x1, y: bb.y1 },
                    { x: bb.x2, y: bb.y1 },
                    { x: bb.x2, y: bb.y2 },
                    { x: bb.x1, y: bb.y2 },
                ];
                for (const corner of componentCorners) {
                    const worldPoint = childWorld.transformPoint(corner);
                    const point = parentInverseWorld.transformPoint(worldPoint);
                    minX = Math.min(minX, point.x);
                    maxX = Math.max(maxX, point.x);
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                }
            }
        }

        if (layoutComponents.length === 0 || shouldIncludeEntityBounds) {
            for (const corner of child.transform.corners) {
                const point = parentInverseWorld.transformPoint(corner);
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
            }
        }

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        return {
            width: maxX - minX,
            height: maxY - minY,
            centerOffsetX: centerX - child.position.x,
            centerOffsetY: centerY - child.position.y,
        };
    }

    #normalizeLayoutGap(gap: VectorConstructor | undefined): number {
        if (typeof gap === 'number') {
            return Number.isFinite(gap) ? gap : 0;
        }
        if (gap) {
            return Number.isFinite(gap.x) ? gap.x : 0;
        }

        return 0;
    }

    #setBackground(
        background: BackgroundConstructor | null,
    ): ReadonlyArray<Component<TEngine>> {
        for (const comp of this._backgroundComponents) {
            comp.destroy();
        }
        this._backgroundComponents = [];

        if (background) {
            const backgroundArray = Array.isArray(background)
                ? background
                : [background];
            for (const bgConstructor of backgroundArray) {
                let json: ComponentJSON;
                if (
                    typeof bgConstructor === 'boolean' ||
                    typeof bgConstructor === 'string'
                ) {
                    json = {
                        type: 'rectangle',
                        color:
                            typeof bgConstructor === 'boolean'
                                ? 'black'
                                : bgConstructor,
                        opacity: 0.5,
                    };
                } else {
                    json = bgConstructor;
                }

                json.fill = true;
                if (json.zIndex === undefined) {
                    json.zIndex = -1000;
                }

                this._backgroundComponents.push(this.addComponent(json));
            }
        }

        return this._backgroundComponents;
    }

    #computeZIndex(
        pointerHovered: boolean = this._collider?.isPointerHovered ?? false,
    ): void {
        const prevZIndex = this.zIndex;
        this.#computedZIndex = pointerHovered
            ? this._hoverZIndex
            : this._zIndex;
        if (this._parent && prevZIndex !== this.#computedZIndex) {
            this._parent.childrenZIndexDirty = true;
        }
    }
}
