import type { Engine } from '../engine';
import { Vector, type VectorConstructor } from '../math/vector';
import { type C_ColliderOptions } from './colliders';
import { C_Drawable, type C_DrawableOptions } from './drawable';

export interface C_ShapeBaseOptions extends C_DrawableOptions, C_ColliderOptions {
    repeat?: VectorConstructor;
    gap?: VectorConstructor;
}

export abstract class C_ShapeBase<
    TEngine extends Engine = Engine,
> extends C_Drawable<TEngine> {
    #repeat: Vector;
    #gap: Vector;

    constructor(options: C_ShapeBaseOptions, defaultName: string) {
        super({ name: defaultName, ...options });
        this.#repeat = new Vector(options.repeat ?? 1);
        this.#gap = new Vector(options.gap ?? 1);
    }

    get repeat(): Vector {
        return this.#repeat;
    }

    get gap(): Vector {
        return this.#gap;
    }

    setRepeat(repeat: VectorConstructor): this {
        this.#repeat.set(repeat);
        return this;
    }

    setGap(gap: VectorConstructor): this {
        this.#gap.set(gap);
        return this;
    }
}
