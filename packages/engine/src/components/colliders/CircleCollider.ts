import { C_Collider, C_ColliderOptions } from '.';
import { Engine } from '../../engine';

interface C_CircleColliderOptions extends C_ColliderOptions {}

export interface C_CircleColliderJSON extends C_CircleColliderOptions {
    type: 'circleCollider';
}

export class C_CircleCollider<
    TEngine extends Engine = Engine,
> extends C_Collider<TEngine> {
    #radius: number = 0;

    constructor(options: C_CircleColliderOptions) {
        super(options);

        this._type = 'circle';
        this._collisionBounds = [this.entity.position.extract()];
    }

    override get typeString(): string {
        return 'C_CircleCollider';
    }

    get radius(): number {
        return this.#radius;
    }

    override _computeCollisionBounds(): void {
        this._collisionBounds[0] = this.entity.position.extract();
        this.#radius = Math.min(this.entity.scale.x, this.entity.scale.y) / 2;
    }
}
