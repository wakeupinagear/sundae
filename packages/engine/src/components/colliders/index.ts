import { type Engine } from '../../engine';
import { type BoundingBox } from '../../math/boundingBox';
import { type Vector } from '../../math/vector';
import type { CursorType } from '../../systems/pointer';
import { type CollisionContact } from '../../types';
import { Component, type ComponentOptions } from '../index';
import { type C_Rigidbody } from '../rigidbody';
import type { C_CircleCollider } from './CircleCollider';
import { type C_RectangleCollider } from './RectangleCollider';

export type { C_PolygonCollider } from './PolygonCollider';

type ColliderType = 'circle' | 'rectangle' | 'polygon';

type CollisionMode = 'trigger' | 'solid' | 'none';

export type CollisionBounds = Vector[];

type ColliderPointerEventHandler = ((collider: C_Collider) => void) | null;

export interface C_ColliderOptions extends ComponentOptions {
    collision?: CollisionMode;
    pointerTarget?: boolean;
    onPointerEnter?: ColliderPointerEventHandler;
    onPointerStay?: ColliderPointerEventHandler;
    onPointerLeave?: ColliderPointerEventHandler;
    cursorOnHover?: CursorType | null;
    cursorPriority?: number;
}

export abstract class C_Collider<
    TEngine extends Engine = Engine,
> extends Component<TEngine> {
    _type!: ColliderType;

    #collision: CollisionMode;
    #pointerTarget: boolean;
    #onPointerEnterCB: ColliderPointerEventHandler;
    #onPointerStayCB: ColliderPointerEventHandler;
    #onPointerLeaveCB: ColliderPointerEventHandler;
    #cursorOnHover: C_ColliderOptions['cursorOnHover'];
    #cursorPriority: number;

    #rigidbody: C_Rigidbody<TEngine> | null = null;

    _collisionBounds: CollisionBounds = [];
    #collisionBoundsDirty: boolean = true;

    #isPointerHovered: boolean = false;
    #prevIsPointerHovered: boolean = false;
    #hoverJustChanged: boolean = false;

    constructor(options: C_ColliderOptions) {
        super(options);

        this.#collision = options.collision ?? 'none';
        this.#pointerTarget = options.pointerTarget ?? false;
        this.#onPointerEnterCB = options.onPointerEnter ?? null;
        this.#onPointerStayCB = options.onPointerStay ?? null;
        this.#onPointerLeaveCB = options.onPointerLeave ?? null;
        this.#cursorOnHover = options.cursorOnHover ?? null;
        this.#cursorPriority = options.cursorPriority ?? 5;

        this._engine.physicsSystem.registerPhysicsEntity(this.entity);
    }

    get type(): ColliderType {
        return this._type;
    }

    get collisionMode(): CollisionMode {
        return this.#collision;
    }

    set collisionMode(collisionMode: CollisionMode) {
        this.#collision = collisionMode;
    }

    get pointerTarget(): boolean {
        return this.#pointerTarget;
    }

    set pointerTarget(pointerTarget: boolean) {
        this.#pointerTarget = pointerTarget;
    }

    get isPointerHovered(): boolean {
        return this.#prevIsPointerHovered;
    }

    set isPointerHovered(isPointerHovered: boolean) {
        this.#isPointerHovered = isPointerHovered;
    }

    get hoverJustChanged(): boolean {
        return this.#hoverJustChanged;
    }

    get rigidbody(): C_Rigidbody<TEngine> | null {
        return this.#rigidbody;
    }

    set rigidbody(rigidbody: C_Rigidbody<TEngine> | null) {
        if (this.#rigidbody !== rigidbody) {
            this.#rigidbody = rigidbody;
        }
    }

    get collisionBounds(): Readonly<CollisionBounds> {
        if (this.#collisionBoundsDirty) {
            this._computeCollisionBounds();
            this.#collisionBoundsDirty = false;
        }

        return this._collisionBounds;
    }

    override update(): boolean | void {
        if (
            this.#pointerTarget &&
            this.#prevIsPointerHovered !== this.#isPointerHovered
        ) {
            if (this.#isPointerHovered) {
                this.#onPointerEnter();
            } else {
                this.#onPointerLeave();
            }

            this.#prevIsPointerHovered = this.#isPointerHovered;
            this.#hoverJustChanged = true;
        } else {
            if (this.#isPointerHovered) {
                this.#onPointerStay();
            }
            this.#hoverJustChanged = Boolean(
                this.#isPointerHovered && !this.#pointerTarget,
            );
        }

        this.#isPointerHovered = false;

        return false;
    }

    override destroy(): void {
        super.destroy();

        if (this.#prevIsPointerHovered) {
            this.#onPointerLeave();
        }
        if (!this.entity.rigidbody) {
            this._engine.physicsSystem.unregisterPhysicsEntity(this.entity);
        }
    }

    abstract checkIfPointInside(worldPosition: Vector): boolean;

    abstract checkIfBoxIntersects(bbox: BoundingBox): boolean;

    checkIfPointerOver(worldPosition: Vector): boolean {
        if (!this.enabled || !this.entity?.enabled) {
            return false;
        }

        this.#isPointerHovered ||= this.checkIfPointInside(worldPosition);

        return this.#isPointerHovered;
    }

    checkIfWithinBox(bbox: BoundingBox): boolean {
        if (!this.enabled || !this.entity?.enabled || !this.#pointerTarget) {
            return false;
        }

        return this.checkIfBoxIntersects(bbox);
    }

    static resolveCircleCircleCollision = <TEngine extends Engine = Engine>(
        circleCollA: C_CircleCollider<TEngine>,
        circleCollB: C_CircleCollider<TEngine>,
    ): CollisionContact<TEngine> | null => {
        const distance = circleCollA.entity.position.distanceTo(
            circleCollB.entity.position,
        );

        if (distance > circleCollA.radius + circleCollB.radius) {
            return null;
        }

        const contactNormal = circleCollA.entity.position
            .sub(circleCollB.entity.position)
            .normalize();
        const penetrationDepth =
            circleCollA.radius + circleCollB.radius - distance;
        const point = circleCollA.entity.position.add(
            contactNormal.scaleBy(circleCollA.radius),
        );

        return {
            contactNormal,
            penetrationDepth,
            point,
            self: circleCollA,
            other: circleCollB,
        };
    };

    static resolveRectangleRectangleCollision = <
        TEngine extends Engine = Engine,
    >(
        rectangleCollA: C_RectangleCollider<TEngine>,
        rectangleCollB: C_RectangleCollider<TEngine>,
    ): CollisionContact<TEngine> | null => {
        const cornersA = rectangleCollA.entity.transform.corners;
        const cornersB = rectangleCollB.entity.transform.corners;

        let minOverlap = Infinity;
        let smallestAxis = null;

        const axes = [
            cornersA[1].sub(cornersA[0]).normalize(), // Edge 0-1 of A
            cornersA[2].sub(cornersA[1]).normalize(), // Edge 1-2 of A
            cornersB[1].sub(cornersB[0]).normalize(), // Edge 0-1 of B
            cornersB[2].sub(cornersB[1]).normalize(), // Edge 1-2 of B
        ];

        for (const axis of axes) {
            let minA = Infinity;
            let maxA = -Infinity;
            for (let i = 0; i < 4; i++) {
                const projection = cornersA[i].dot(axis);
                minA = Math.min(minA, projection);
                maxA = Math.max(maxA, projection);
            }

            let minB = Infinity;
            let maxB = -Infinity;
            for (let i = 0; i < 4; i++) {
                const projection = cornersB[i].dot(axis);
                minB = Math.min(minB, projection);
                maxB = Math.max(maxB, projection);
            }

            if (maxA < minB || maxB < minA) {
                return null;
            }

            const overlap = Math.min(maxA - minB, maxB - minA);
            if (overlap < minOverlap) {
                minOverlap = overlap;
                smallestAxis = axis;
            }
        }

        if (!smallestAxis) {
            return null;
        }

        const direction = rectangleCollA.entity.position.sub(
            rectangleCollB.entity.position,
        );
        let contactNormal = smallestAxis.clone();
        if (direction.dot(contactNormal) < 0) {
            contactNormal = contactNormal.negate();
        }

        const point = rectangleCollA.entity.position.add(
            contactNormal.scaleBy(-minOverlap / 2),
        );

        return {
            contactNormal,
            penetrationDepth: minOverlap,
            point,
            self: rectangleCollA,
            other: rectangleCollB,
        };
    };

    static resolveCircleRectangleCollision = <TEngine extends Engine = Engine>(
        circleColl: C_CircleCollider<TEngine>,
        rectangleColl: C_RectangleCollider<TEngine>,
    ): CollisionContact<TEngine> | null => {
        const circleCenter = circleColl.entity.position;
        const corners = rectangleColl.entity.transform.corners;

        let closestPoint = circleCenter.clone();
        let minDistanceSquared = Infinity;

        for (let i = 0; i < 4; i++) {
            const edgeStart = corners[i];
            const edgeEnd = corners[(i + 1) % 4];
            const edge = edgeEnd.sub(edgeStart);
            const edgeLength = edge.length();

            if (edgeLength === 0) continue;

            const toCircle = circleCenter.sub(edgeStart);
            const t = Math.max(
                0,
                Math.min(1, toCircle.dot(edge) / (edgeLength * edgeLength)),
            );

            const pointOnEdge = edgeStart.add(edge.scaleBy(t));
            const distanceSquared = circleCenter.distanceSquaredTo(pointOnEdge);

            if (distanceSquared < minDistanceSquared) {
                minDistanceSquared = distanceSquared;
                closestPoint = pointOnEdge;
            }
        }

        const distance = Math.sqrt(minDistanceSquared);
        const radius = circleColl.radius;
        if (distance > radius) {
            return null;
        }

        const contactNormal =
            distance > 0
                ? circleCenter.sub(closestPoint).normalize()
                : circleCenter.sub(rectangleColl.entity.position).normalize();
        const penetrationDepth = radius - distance;

        const point = closestPoint.clone();

        return {
            contactNormal,
            penetrationDepth,
            point,
            self: circleColl,
            other: rectangleColl,
        };
    };

    static isCollisionEnabledInOptions(options: C_ColliderOptions): boolean {
        return Boolean(options.collision !== 'none' || options.pointerTarget);
    }

    static getCollisionOptionsForEntity(
        options: C_ColliderOptions,
    ): Partial<C_ColliderOptions> {
        return {
            collision: options.collision ?? 'none',
            pointerTarget: options.pointerTarget ?? false,
            onPointerEnter: options.onPointerEnter ?? null,
            onPointerStay: options.onPointerStay ?? null,
            onPointerLeave: options.onPointerLeave ?? null,
            cursorOnHover: options.cursorOnHover ?? null,
        };
    }

    resolveCollision(
        otherCollider: C_Collider<TEngine>,
    ): CollisionContact<TEngine> | null {
        if (this.type === 'circle' && otherCollider.type === 'circle') {
            return C_Collider.resolveCircleCircleCollision(
                this as unknown as C_CircleCollider<TEngine>,
                otherCollider as unknown as C_CircleCollider<TEngine>,
            );
        } else if (
            this.type === 'rectangle' &&
            otherCollider.type === 'rectangle'
        ) {
            return C_Collider.resolveRectangleRectangleCollision(
                this as unknown as C_RectangleCollider<TEngine>,
                otherCollider as unknown as C_RectangleCollider<TEngine>,
            );
        } else if (
            this.type === 'circle' &&
            otherCollider.type === 'rectangle'
        ) {
            return C_Collider.resolveCircleRectangleCollision(
                this as unknown as C_CircleCollider<TEngine>,
                otherCollider as unknown as C_RectangleCollider<TEngine>,
            );
        } else if (
            this.type === 'rectangle' &&
            otherCollider.type === 'circle'
        ) {
            return C_Collider.resolveCircleRectangleCollision(
                otherCollider as unknown as C_CircleCollider<TEngine>,
                this as unknown as C_RectangleCollider<TEngine>,
            );
        }
        // Polygon vs anything: stubbed (no collision resolution implemented)
        if (this.type === 'polygon' || otherCollider.type === 'polygon') {
            return null;
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

    #onPointerEnter(): void {
        if (this.#cursorOnHover) {
            this._engine.requestCursor(
                this.#cursorOnHover,
                this.#cursorPriority,
            );
        }

        this.#onPointerEnterCB?.(this);
        this._entity.onPointerEnter();
    }

    #onPointerStay(): void {
        this.#onPointerStayCB?.(this);
        this._entity.onPointerStay();
    }

    #onPointerLeave(): void {
        this.#onPointerLeaveCB?.(this);
        this._entity.onPointerLeave();
    }
}
