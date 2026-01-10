import { Entity, type EntityOptions, type InternalEntityOptions } from '.';
import { Engine } from '../engine';
import { E_Image, E_ImageJSON } from '../objects/image';
import { E_Shape, E_ShapeJSON } from '../objects/shape';
import { E_Text, E_TextJSON } from '../objects/text';

export type BaseEntityJSON = EntityOptions & { type?: 'entity' };

export type EntityJSON =
    | E_TextJSON
    | E_ShapeJSON
    | E_ImageJSON
    | BaseEntityJSON;

export function createEntityFromJSON<TEngine extends Engine = Engine>(
    json: EntityJSON & InternalEntityOptions<TEngine>,
): Entity<TEngine> {
    switch (json.type) {
        case 'entity':
            return new Entity<TEngine>(json);
        case 'text':
            return new E_Text<TEngine>(json);
        case 'shape':
            return new E_Shape<TEngine>(json);
        case 'image':
            return new E_Image<TEngine>(json);
        default:
            return new Entity<TEngine>(json);
    }
}
