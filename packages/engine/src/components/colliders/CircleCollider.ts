import { C_Collider, C_ColliderOptions } from '.';
import { Engine } from '../../engine';

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
}
