import { type EntityOptions } from '..';
import type { C_Circle, C_CircleOptions } from '../../components/circle';
import { C_Collider } from '../../components/colliders';
import type { C_CircleCollider } from '../../components/colliders/CircleCollider';
import type { Engine } from '../../engine';
import { E_ShapeBase } from '../shape';

export interface E_CircleOptions extends EntityOptions, C_CircleOptions {}

export interface E_CircleJSON extends E_CircleOptions {
    type: 'circle';
}

export class E_Circle<
    TEngine extends Engine = Engine,
> extends E_ShapeBase<TEngine> {
    #circle: C_Circle<TEngine>;

    constructor(options: E_CircleOptions) {
        super(options);

        this.#circle = this.addComponent<C_Circle<TEngine>>({
            ...options,
            type: 'circle',
            name: 'Circle',
        });

        if (C_Collider.isCollisionEnabledInOptions(options)) {
            const collOptions =
                C_Collider.getCollisionOptionsForEntity(options);
            this.setCollider<C_CircleCollider<TEngine>>({
                type: 'circleCollider',
                ...collOptions,
            });
        }
    }

    get shape(): C_Circle<TEngine> {
        return this.#circle;
    }
}
