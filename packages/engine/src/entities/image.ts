import { Entity, type EntityOptions } from '.';
import { C_Collider } from '../components/colliders';
import type { C_RectangleCollider } from '../components/colliders/RectangleCollider';
import type { C_Image, C_ImageOptions } from '../components/image';
import type { Engine } from '../engine';

export interface E_ImageOptions extends EntityOptions, C_ImageOptions {}

export interface E_ImageJSON extends E_ImageOptions {
    type: 'image';
}

export class E_Image<TEngine extends Engine = Engine> extends Entity<TEngine> {
    #image: C_Image<TEngine>;

    constructor(options: E_ImageOptions) {
        super(options);

        this.#image = this.addComponent<C_Image<TEngine>>({
            ...options,
            type: 'image',
            name: 'Image',
        });

        if (C_Collider.isCollisionEnabledInOptions(options)) {
            this._collider = this.addComponent<C_RectangleCollider<TEngine>>({
                type: 'rectangleCollider',
                ...C_Collider.getCollisionOptionsForEntity(options),
            });
        }
    }

    get image(): C_Image<TEngine> {
        return this.#image;
    }
}
