import { type EntityOptions } from '..';
import type { C_Line, C_LineOptions } from '../../components/line';
import type { Engine } from '../../engine';
import { E_ShapeBase } from '../shape';

export interface E_LineOptions extends EntityOptions, C_LineOptions {}

export interface E_LineJSON extends E_LineOptions {
    type: 'line';
}

export class E_Line<
    TEngine extends Engine = Engine,
> extends E_ShapeBase<TEngine> {
    #line: C_Line<TEngine>;

    constructor(options: E_LineOptions) {
        super(options);

        this.#line = this.addComponent<C_Line<TEngine>>({
            ...options,
            type: 'line',
            name: 'Line',
        });
    }

    get shape(): C_Line<TEngine> {
        return this.#line;
    }
}
