import { Entity, type EntityOptions } from '.';
import { C_Collider } from '../components/colliders';
import type { C_Polygon, C_PolygonOptions } from '../components/polygon';
import type { Engine } from '../engine';
import type { VectorConstructor } from '../math/vector';

export interface E_PolygonOptions extends EntityOptions, C_PolygonOptions {
    collision?: boolean;
    mass?: number;
    kinematic?: boolean;
    velocity?: VectorConstructor;
    force?: VectorConstructor;
    gravityScale?: VectorConstructor;
    bounce?: number;
}

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
        });

        if (C_Collider.isCollisionEnabledInOptions(options)) {
            const collOptions =
                C_Collider.getCollisionOptionsForEntity(options);
            // TODO: Add collision support for polygons
        }
    }

    get polygon(): C_Polygon<TEngine> {
        return this.#polygon;
    }
}
