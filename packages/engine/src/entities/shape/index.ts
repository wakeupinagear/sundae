import { Entity, type EntityOptions } from '..';
import type { C_ShapeBase } from '../../components/shape';
import type { Engine } from '../../engine';

export interface E_ShapeBaseOptions extends EntityOptions {}

export abstract class E_ShapeBase<TEngine extends Engine = Engine> extends Entity<TEngine> {
    abstract get shape(): C_ShapeBase<TEngine>;
}
