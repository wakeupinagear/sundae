import { Engine } from '../../engine';
import { IVector } from '../../exports';
import { Component, ComponentOptions } from '../factory';

type ColliderType = 'circle' | 'rectangle';

export type CollisionBounds = IVector<number>[];

export interface C_ColliderOptions extends ComponentOptions {}

export abstract class C_Collider<
    TEngine extends Engine = Engine,
> extends Component<TEngine> {
    _type!: ColliderType;

    _collisionBounds: CollisionBounds = [];
    #collisionBoundsDirty: boolean = true;

    constructor(options: C_ColliderOptions) {
        super(options);
    }

    get type(): ColliderType {
        return this._type;
    }

    get collisionBounds(): Readonly<CollisionBounds> {
        if (this.#collisionBoundsDirty) {
            this._computeCollisionBounds();
            this.#collisionBoundsDirty = false;
        }

        return this._collisionBounds;
    }

    markCollisionBoundsDirty(): void {
        if (!this.#collisionBoundsDirty) {
            this.#collisionBoundsDirty = true;
            this.entity.markBoundsDirty();
        }
    }

    _computeCollisionBounds(): void {
        this._collisionBounds = [];
    }
}
