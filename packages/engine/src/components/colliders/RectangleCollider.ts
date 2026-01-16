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
        if (this._collisionBounds.length !== 4) {
            this._collisionBounds = [
                corners[0].clone(),
                corners[1].clone(),
                corners[2].clone(),
                corners[3].clone(),
            ];
        } else {
            this._collisionBounds[0].set(corners[0]);
            this._collisionBounds[1].set(corners[1]);
            this._collisionBounds[2].set(corners[2]);
            this._collisionBounds[3].set(corners[3]);
        }
    }
}
