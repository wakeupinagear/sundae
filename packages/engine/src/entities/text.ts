import { Entity, type EntityOptions } from '.';
import type { C_Text, C_TextOptions } from '../components/text';
import type { Engine } from '../engine';
import type { VectorConstructor } from '../math/vector';
import type { TwoAxisAlignment } from '../types';

const TEXT_ALIGN_TO_ORIGIN: Record<TwoAxisAlignment, VectorConstructor> = {
    'top-left': { x: 1, y: 1 },
    'top-center': { x: 0.5, y: 1 },
    'top-right': { x: 0, y: 1 },
    left: { x: 1, y: 0.5 },
    center: { x: 0.5, y: 0.5 },
    right: { x: 0, y: 0.5 },
    'bottom-left': { x: 1, y: 0 },
    'bottom-center': { x: 0.5, y: 0 },
    'bottom-right': { x: 0, y: 0 },
};

export interface E_TextOptions extends EntityOptions, C_TextOptions {}

export interface E_TextJSON extends E_TextOptions {
    type: 'text';
}

export class E_Text<TEngine extends Engine = Engine> extends Entity<TEngine> {
    #text: C_Text<TEngine>;

    constructor(options: E_TextOptions) {
        super(options);

        this.#text = this.addComponent<C_Text<TEngine>>({
            origin: options.textAlign
                ? TEXT_ALIGN_TO_ORIGIN[options.textAlign]
                : undefined,
            ...options,
            type: 'text',
            name: 'Text',
            zIndex: 0,
        });
    }

    get text(): string {
        return this.#text.text;
    }

    set text(text: string) {
        this.#text.text = text;
    }

    get textComponent(): C_Text<TEngine> {
        return this.#text;
    }
}
