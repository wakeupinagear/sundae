import { Entity, type EntityOptions } from '..';
import { C_Collider } from '../../components/colliders';
import type { C_CircleCollider } from '../../components/colliders/CircleCollider';
import type { C_RectangleCollider } from '../../components/colliders/RectangleCollider';
import type { C_Shape, C_ShapeOptions } from '../../components/shape';
import type { Engine } from '../../engine';

export interface E_ShapeOptions extends EntityOptions, C_ShapeOptions {}

export interface E_ShapeJSON extends E_ShapeOptions {
    type: 'shape';
}

export class E_Shape<TEngine extends Engine = Engine> extends Entity<TEngine> {
    #shape: C_Shape<TEngine>;

    constructor(options: E_ShapeOptions) {
        super(options);

        this.#shape = this.addComponent<C_Shape<TEngine>>({
            ...options,
            type: 'shape',
            name: 'Shape',
        });

        if (C_Collider.isCollisionEnabledInOptions(options)) {
            const collOptions =
                C_Collider.getCollisionOptionsForEntity(options);
            if (options.shape === 'RECT') {
                this.setCollider<C_RectangleCollider<TEngine>>({
                    type: 'rectangleCollider',
                    ...collOptions,
                });
            } else if (options.shape === 'ELLIPSE') {
                this.setCollider<C_CircleCollider<TEngine>>({
                    type: 'circleCollider',
                    ...collOptions,
                });
            } else {
                this._engine.warn(
                    `Collision not supported for shape '${options.shape}'`,
                );
            }
        }
    }

    get shape(): C_Shape<TEngine> {
        return this.#shape;
    }
}
