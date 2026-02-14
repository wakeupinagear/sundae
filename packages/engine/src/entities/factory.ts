import { type Engine } from '../engine';
import {
    Entity,
    type EntityOptions,
    type InternalEntityOptions,
} from '../entities';
import { E_Circle, type E_CircleJSON } from './circle';
import { E_Image, type E_ImageJSON } from './image';
import { E_Line, type E_LineJSON } from './line';
import { E_Polygon, type E_PolygonJSON } from './polygon';
import { E_Rectangle, type E_RectangleJSON } from './rectangle';
import { E_InfiniteShape, type E_InfiniteShapeJSON } from './shape/infinite';
import { E_Text, type E_TextJSON } from './text';

export type BaseEntityJSON = EntityOptions & { type?: 'entity' };

// Type for entity constructors
export type EntityConstructor<T extends Entity = Entity> = new (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any,
) => T;

type IfAny<T, TIfAny, TIfNotAny> = 0 extends 1 & T ? TIfAny : TIfNotAny;

// Extract constructor options from an entity class
type ExtractEntityOptions<TCtor extends EntityConstructor> = TCtor extends new (
    options: infer TOptions extends EntityOptions,
) => Entity
    ? IfAny<TOptions, EntityOptions, TOptions>
    : never;

// Custom entity JSON type for class constructors
export type CustomEntityJSON<TCtor extends EntityConstructor> =
    ExtractEntityOptions<TCtor> & {
        type: TCtor;
    };

// String-based entity types
export type StringEntityJSON =
    | E_TextJSON
    | E_CircleJSON
    | E_RectangleJSON
    | E_LineJSON
    | E_InfiniteShapeJSON
    | E_PolygonJSON
    | E_ImageJSON
    | BaseEntityJSON;

// Combined entity JSON type supporting both strings and class constructors
// Note: When using class constructors, use the function overloads directly
export type EntityJSON = StringEntityJSON | BaseEntityJSON;

export function createEntityFromJSON<TEngine extends Engine = Engine>(
    json:
        | (EntityJSON & InternalEntityOptions<TEngine>)
        | (CustomEntityJSON<EntityConstructor> &
              InternalEntityOptions<TEngine>),
): Entity<TEngine> {
    // Check if type is a constructor function
    if (typeof json.type === 'function') {
        const Constructor = json.type as EntityConstructor<Entity<TEngine>>;
        return new Constructor(json);
    }

    // Handle string-based types
    switch (json.type) {
        case 'entity':
            return new Entity<TEngine>(json);
        case 'text':
            return new E_Text<TEngine>(json);
        case 'circle':
            return new E_Circle<TEngine>(json);
        case 'rectangle':
            return new E_Rectangle<TEngine>(json);
        case 'line':
            return new E_Line<TEngine>(json);
        case 'infinite_shape':
            return new E_InfiniteShape<TEngine>(json);
        case 'polygon':
            return new E_Polygon<TEngine>(json);
        case 'image':
            return new E_Image<TEngine>(json);
        default:
            return new Entity<TEngine>(json);
    }
}
