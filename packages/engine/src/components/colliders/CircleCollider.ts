import { type Engine } from '../../engine';
import { type BoundingBox } from '../../math/boundingBox';
import { type Vector } from '../../math/vector';
import { C_Collider, type C_ColliderOptions } from './index';

interface C_CircleColliderOptions extends C_ColliderOptions {}

export interface C_CircleColliderJSON extends C_CircleColliderOptions {
    type: 'circleCollider';
}

export class C_CircleCollider<
    TEngine extends Engine = Engine,
> extends C_Collider<TEngine> {
    public static typeString: string = 'C_CircleCollider';

    constructor(options: C_CircleColliderOptions) {
        super(options);

        this._type = 'circle';
    }

    override get typeString(): string {
        return C_CircleCollider.typeString;
    }

    get radius(): number {
        return Math.min(this.entity.scale.x, this.entity.scale.y) / 2;
    }

    override _computeCollisionBounds(): void {
        if (this._collisionBounds.length === 0) {
            this._collisionBounds = [this.entity.position.clone()];
        } else {
            this._collisionBounds[0].set(this.entity.position);
        }
    }

    override checkIfPointInside(worldPosition: Vector): boolean {
        const center = this.entity.position;
        const distance = center.distanceTo(worldPosition);

        return distance <= this.radius;
    }

    override checkIfBoxIntersects(bbox: BoundingBox): boolean {
        const center = this.entity.position;
        const radius = this.radius;

        const closestX = Math.max(bbox.x1, Math.min(center.x, bbox.x2));
        const closestY = Math.max(bbox.y1, Math.min(center.y, bbox.y2));

        const distanceX = center.x - closestX;
        const distanceY = center.y - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;

        return distanceSquared <= radius * radius;
    }
}
