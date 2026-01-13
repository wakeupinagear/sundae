import { Engine } from '../../engine';
import { IVector } from '../../exports';
import { CollisionContact } from '../../systems/physics';
import { Component, ComponentOptions } from '../factory';
import { C_CircleCollider } from './CircleCollider';
import { C_RectangleCollider } from './RectangleCollider';

const resolveCircleCircleCollision = <TEngine extends Engine = Engine>(
    circleCollA: C_CircleCollider<TEngine>,
    circleCollB: C_CircleCollider<TEngine>,
): CollisionContact | null => {
    const distance = circleCollA.entity.position.distanceTo(
        circleCollB.entity.position,
    );
    if (distance > circleCollA.radius + circleCollB.radius) {
        return null;
    }

    const contactNormal = circleCollA.entity.position
        .sub(circleCollB.entity.position)
        .normalize();
    const penetrationDepth = circleCollA.radius + circleCollB.radius - distance;
    const point = circleCollA.entity.position.add(
        contactNormal.scaleBy(circleCollA.radius),
    );

    return { contactNormal, penetrationDepth, point };
};

const resolveRectangleRectangleCollision = <TEngine extends Engine = Engine>(
    rectangleCollA: C_RectangleCollider<TEngine>,
    rectangleCollB: C_RectangleCollider<TEngine>,
): CollisionContact | null => {
    return null;
};

const resolveCircleRectangleCollision = <TEngine extends Engine = Engine>(
    circleColl: C_CircleCollider<TEngine>,
    rectangleColl: C_RectangleCollider<TEngine>,
): CollisionContact | null => {
    return null;
};

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

    resolveCollision(
        otherCollider: C_Collider<TEngine>,
    ): CollisionContact | null {
        if (this.type === 'circle' && otherCollider.type === 'circle') {
            return resolveCircleCircleCollision(
                this as unknown as C_CircleCollider<TEngine>,
                otherCollider as unknown as C_CircleCollider<TEngine>,
            );
        } else if (
            this.type === 'rectangle' &&
            otherCollider.type === 'rectangle'
        ) {
            return resolveRectangleRectangleCollision(
                this as unknown as C_RectangleCollider<TEngine>,
                otherCollider as unknown as C_RectangleCollider<TEngine>,
            );
        } else if (
            this.type === 'circle' &&
            otherCollider.type === 'rectangle'
        ) {
            return resolveCircleRectangleCollision(
                this as unknown as C_CircleCollider<TEngine>,
                otherCollider as unknown as C_RectangleCollider<TEngine>,
            );
        } else if (
            this.type === 'rectangle' &&
            otherCollider.type === 'circle'
        ) {
            return resolveCircleRectangleCollision(
                otherCollider as unknown as C_CircleCollider<TEngine>,
                this as unknown as C_RectangleCollider<TEngine>,
            );
        }

        return null;
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
