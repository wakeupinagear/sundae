import { Entity, type EntityOptions } from '.';
import { C_Collider, type C_PolygonCollider } from '../components/colliders';
import type { C_Polygon, C_PolygonOptions } from '../components/polygon';
import type { Engine } from '../engine';

export interface E_PolygonOptions extends EntityOptions, C_PolygonOptions {}

export interface E_PolygonJSON extends E_PolygonOptions {
    type: 'polygon';
}

export class E_Polygon<
    TEngine extends Engine = Engine,
> extends Entity<TEngine> {
    #polygon: C_Polygon<TEngine>;

    constructor(options: E_PolygonOptions) {
        super(options);

        this.#polygon = this.addComponent<C_Polygon<TEngine>>({
            ...options,
            type: 'polygon',
            name: 'Polygon',
            zIndex: 0,
        });

        if (C_Collider.isCollisionEnabledInOptions(options)) {
            const collOptions =
                C_Collider.getCollisionOptionsForEntity(options);
            this.setCollider<C_PolygonCollider<TEngine>>({
                ...collOptions,
                type: 'polygonCollider',
            });
        }
    }

    get polygon(): C_Polygon<TEngine> {
        return this.#polygon;
    }
}
