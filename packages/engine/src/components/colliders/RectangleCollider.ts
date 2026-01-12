import { C_Collider, C_ColliderOptions } from '.';
import { Engine } from '../../engine';

interface C_RectangleColliderOptions extends C_ColliderOptions {}

export interface C_RectangleColliderJSON extends C_RectangleColliderOptions {
    type: 'rectangleCollider';
}

// Technically an OBB :)
export class C_RectangleCollider<
    TEngine extends Engine = Engine,
> extends C_Collider<TEngine> {
    constructor(options: C_RectangleColliderOptions) {
        super(options);

        this._type = 'rectangle';
    }

    override get typeString(): string {
        return 'C_RectangleCollider';
    }

    override _computeCollisionBounds(): void {
        const corners = this.entity.transform.corners;
        this._collisionBounds = [
            corners[0].extract(),
            corners[1].extract(),
            corners[2].extract(),
            corners[3].extract(),
        ];
    }
}
