import { type EntityOptions } from '..';
import { C_Collider } from '../../components/colliders';
import type { C_RectangleCollider } from '../../components/colliders/RectangleCollider';
import type {
    C_Rectangle,
    C_RectangleOptions,
} from '../../components/rectangle';
import type { Engine } from '../../engine';
import { E_ShapeBase } from '../shape';

export interface E_RectangleOptions extends EntityOptions, C_RectangleOptions {}

export interface E_RectangleJSON extends E_RectangleOptions {
    type: 'rectangle';
}

export class E_Rectangle<
    TEngine extends Engine = Engine,
> extends E_ShapeBase<TEngine> {
    #rectangle: C_Rectangle<TEngine>;

    constructor(options: E_RectangleOptions) {
        super(options);

        this.#rectangle = this.addComponent<C_Rectangle<TEngine>>({
            ...options,
            type: 'rectangle',
            name: 'Rectangle',
        });

        if (C_Collider.isCollisionEnabledInOptions(options)) {
            const collOptions =
                C_Collider.getCollisionOptionsForEntity(options);
            this.setCollider<C_RectangleCollider<TEngine>>({
                type: 'rectangleCollider',
                ...collOptions,
            });
        }
    }

    get shape(): C_Rectangle<TEngine> {
        return this.#rectangle;
    }
}
