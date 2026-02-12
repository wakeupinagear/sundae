import { type EntityJSON } from '../../entities/factory';

export interface SceneJSON {
    name?: string;
    zIndex?: number;
    entities?: EntityJSON[];
}
