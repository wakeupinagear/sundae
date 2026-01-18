import { Engine } from '../../engine';
import { Vector } from '../../exports';
import { CollisionContact } from '../../types';
import { Component, ComponentOptions } from '../factory';
import { C_Rigidbody } from '../rigidbody';
import { C_CircleCollider } from './CircleCollider';
import { C_RectangleCollider } from './RectangleCollider';

const resolveCircleCircleCollision = <TEngine extends Engine = Engine>(
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
    const penetrationDepth = circleCollA.radius + circleCollB.radius - distance;
    const point = circleCollA.entity.position.add(
        contactNormal.scaleBy(circleCollA.radius),
    );

    return {
        contactNormal,
        penetrationDepth,
        point,
        collA: circleCollA,
        collB: circleCollB,
    };
};

const resolveRectangleRectangleCollision = <TEngine extends Engine = Engine>(
    rectangleCollA: C_RectangleCollider<TEngine>,
    rectangleCollB: C_RectangleCollider<TEngine>,
): CollisionContact<TEngine> | null => {
    // Using Separating Axis Theorem (SAT) for OBB collision detection
    const cornersA = rectangleCollA.entity.transform.corners;
    const cornersB = rectangleCollB.entity.transform.corners;

    let minOverlap = Infinity;
    let smallestAxis = null;

    // Test axes perpendicular to edges of both rectangles
    const axes = [
        cornersA[1].sub(cornersA[0]).normalize(), // Edge 0-1 of A
        cornersA[2].sub(cornersA[1]).normalize(), // Edge 1-2 of A
        cornersB[1].sub(cornersB[0]).normalize(), // Edge 0-1 of B
        cornersB[2].sub(cornersB[1]).normalize(), // Edge 1-2 of B
    ];

    for (const axis of axes) {
        // Project all vertices onto the axis
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

        // Check for separation
        if (maxA < minB || maxB < minA) {
            return null; // Separating axis found, no collision
        }

        // Calculate overlap
        const overlap = Math.min(maxA - minB, maxB - minA);
        if (overlap < minOverlap) {
            minOverlap = overlap;
            smallestAxis = axis;
        }
    }

    if (!smallestAxis) {
        return null;
    }

    // Ensure the contact normal points from B to A
    const direction = rectangleCollA.entity.position.sub(
        rectangleCollB.entity.position,
    );
    let contactNormal = smallestAxis.clone();
    if (direction.dot(contactNormal) < 0) {
        contactNormal = contactNormal.negate();
    }

    // Calculate contact point (approximate as midpoint along collision normal)
    const point = rectangleCollA.entity.position.add(
        contactNormal.scaleBy(-minOverlap / 2),
    );

    return {
        contactNormal,
        penetrationDepth: minOverlap,
        point,
        collA: rectangleCollA,
        collB: rectangleCollB,
    };
};

const resolveCircleRectangleCollision = <TEngine extends Engine = Engine>(
    circleColl: C_CircleCollider<TEngine>,
    rectangleColl: C_RectangleCollider<TEngine>,
): CollisionContact<TEngine> | null => {
    const circleCenter = circleColl.entity.position;
    const corners = rectangleColl.entity.transform.corners;

    // Find the closest point on the rectangle to the circle center
    // We'll test each edge of the rectangle and find the minimum distance
    let closestPoint = circleCenter.clone();
    let minDistanceSquared = Infinity;

    // Check each edge of the rectangle
    for (let i = 0; i < 4; i++) {
        const edgeStart = corners[i];
        const edgeEnd = corners[(i + 1) % 4];
        const edge = edgeEnd.sub(edgeStart);
        const edgeLength = edge.length();

        if (edgeLength === 0) continue;

        // Project circle center onto edge
        const toCircle = circleCenter.sub(edgeStart);
        const t = Math.max(
            0,
            Math.min(1, toCircle.dot(edge) / (edgeLength * edgeLength)),
        );

        // Get the closest point on this edge
        const pointOnEdge = edgeStart.add(edge.scaleBy(t));
        const distanceSquared = circleCenter.distanceSquaredTo(pointOnEdge);

        if (distanceSquared < minDistanceSquared) {
            minDistanceSquared = distanceSquared;
            closestPoint = pointOnEdge;
        }
    }

    const distance = Math.sqrt(minDistanceSquared);
    const radius = circleColl.radius;

    // Check if there's a collision
    if (distance > radius) {
        return null;
    }

    // Calculate collision data
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
        collA: circleColl,
        collB: rectangleColl,
    };
};

type ColliderType = 'circle' | 'rectangle';

export type CollisionBounds = Vector[];

export interface C_ColliderOptions extends ComponentOptions {}

export abstract class C_Collider<
    TEngine extends Engine = Engine,
> extends Component<TEngine> {
    _type!: ColliderType;
    #rigidbody: C_Rigidbody<TEngine> | null = null;

    _collisionBounds: CollisionBounds = [];
    #collisionBoundsDirty: boolean = true;

    constructor(options: C_ColliderOptions) {
        super(options);
    }

    get type(): ColliderType {
        return this._type;
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

    resolveCollision(
        otherCollider: C_Collider<TEngine>,
    ): CollisionContact<TEngine> | null {
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
