import type { Engine } from '../engine';
import { Entity } from '../entities';
import type { RenderCommandStream } from '../systems/render/command';
import type {
    BoundingBox,
    Camera,
    CollisionContact,
    Renderable,
} from '../types';

export interface ComponentOptions {
    name?: string;
    enabled?: boolean;
    zIndex?: number;
}

export interface InternalComponentOptions<TEngine extends Engine = Engine>
    extends ComponentOptions {
    engine: TEngine;
    entity: Entity<TEngine>;
}

export abstract class Component<TEngine extends Engine = Engine>
    implements Renderable
{
    public static typeString: string = 'Component';
    protected static _nextId: number = 1;
    protected readonly _id: string = (Component._nextId++).toString();

    protected readonly _name: string;
    protected _engine: TEngine;

    protected _enabled: boolean;
    protected _zIndex: number;

    protected _entity: Entity<TEngine>;

    protected _boundingBox: BoundingBox | null = null;
    protected _boundingBoxDirty: boolean = true;

    constructor(options: ComponentOptions) {
        const {
            name = `component-${this._id}`,
            engine,
            entity,
            ...rest
        } = options as InternalComponentOptions<TEngine>;
        this._name = name;
        this._engine = engine;
        this._entity = entity as Entity<TEngine>;
        this._enabled = rest?.enabled ?? true;
        this._zIndex = rest?.zIndex ?? 0;
    }

    get id(): string {
        return this._id;
    }

    get typeString(): string {
        return Component.typeString;
    }

    get name(): string {
        return this._name;
    }

    get engine(): TEngine {
        return this._engine;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    get zIndex(): number {
        return this._zIndex;
    }

    get entity(): Entity<TEngine> {
        return this._entity;
    }

    get boundingBox(): Readonly<BoundingBox> {
        if (this._boundingBoxDirty) {
            this._computeBoundingBox();
            this._boundingBoxDirty = false;
        }

        return this._boundingBox!;
    }

    isVisual(): boolean {
        return false;
    }

    protected _markBoundsDirty(): void {
        if (!this._boundingBoxDirty) {
            this._boundingBoxDirty = true;
            this._entity.markBoundsDirty();
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    update(_deltaTime: number): boolean | void {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onCollision(contact: CollisionContact<TEngine>): void {}

    destroy(): void {}

    queueRenderCommands(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _stream: RenderCommandStream,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _camera: Camera,
    ): boolean {
        return false;
    }

    setZIndex(zIndex: number): this {
        if (this._zIndex !== zIndex && !isNaN(zIndex)) {
            this._zIndex = zIndex;
            if (this._entity) {
                this._entity.componentsZIndexDirty = true;
                this._entity.onChildComponentsOfTypeChanged(this.typeString);
            }
        }

        return this;
    }

    setEnabled(enabled: boolean): this {
        if (this._enabled !== enabled) {
            this._enabled = enabled;
            this._entity?.onChildComponentsOfTypeChanged(this.typeString);
        }

        return this;
    }

    protected _computeBoundingBox(): void {
        this._boundingBox = { x1: 0, x2: 0, y1: 0, y2: 0 };
    }
}
