import { Entity, type EntityOptions } from '.';
import type { C_Text, C_TextOptions } from '../components/text';
import type { Engine } from '../engine';
import type { VectorConstructor } from '../math/vector';

export interface E_TextOptions extends EntityOptions, C_TextOptions {
    collision?: boolean;
    mass?: number;
    kinematic?: boolean;
    velocity?: VectorConstructor;
    force?: VectorConstructor;
    gravityScale?: VectorConstructor;
    bounce?: number;
}

export interface E_TextJSON extends E_TextOptions {
    type: 'text';
}

export class E_Text<TEngine extends Engine = Engine> extends Entity<TEngine> {
    #text: C_Text<TEngine>;

    constructor(options: E_TextOptions) {
        super(options);

        this.#text = this.addComponent<C_Text<TEngine>>({
            ...options,
            type: 'text',
            name: 'Text',
        });
    }

    get text(): string {
        return this.#text.text;
    }

    set text(text: string) {
        this.#text.text = text;
    }
}
