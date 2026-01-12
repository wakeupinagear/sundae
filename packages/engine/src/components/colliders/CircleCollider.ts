import { C_Collider, C_ColliderOptions } from '.';
import { Engine } from '../../engine';

interface C_CircleColliderOptions extends C_ColliderOptions {}

export interface C_CircleColliderJSON extends C_CircleColliderOptions {
    type: 'circleCollider';
}

export class C_CircleCollider<
    TEngine extends Engine = Engine,
> extends C_Collider<TEngine> {
    constructor(options: C_CircleColliderOptions) {
        super(options);

        this._type = 'circle';
    }

    override get typeString(): string {
        return 'C_CircleCollider';
    }

    override _computeCollisionBounds(): void {
        this._collisionBounds = [this.entity.position.extract()];
    }
}
