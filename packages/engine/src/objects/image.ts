import { C_Drawable, C_DrawableOptions } from '../components/drawable';
import type { Engine } from '../engine';
import { Entity, EntityOptions } from '../entities';
import { Vector, type VectorConstructor } from '../math/vector';
import type { RenderCommandStream } from '../systems/render/command';

interface C_ImageOptions extends C_DrawableOptions {
    imageName: string;
    repeat?: VectorConstructor;
}

export interface C_ImageJSON extends C_ImageOptions {
    type: 'image';
}

export class C_Image<
    TEngine extends Engine = Engine,
> extends C_Drawable<TEngine> {
    #imageName: string;
    #repeat: Vector;

    constructor(options: C_ImageOptions) {
        super(options);

        const { imageName, repeat } = options;
        this.#imageName = imageName;
        this.#repeat = new Vector(repeat ?? 1);
    }

    get imageName(): string {
        return this.#imageName;
    }

    set imageName(imageName: string) {
        this.#imageName = imageName;
    }

    get repeat(): Vector {
        return this.#repeat;
    }

    set repeat(repeat: VectorConstructor | null) {
        this.#repeat = new Vector(repeat ?? 1);
    }

    override queueRenderCommands(stream: RenderCommandStream): boolean {
        if (
            !this._entity ||
            !this.#imageName ||
            !super.queueRenderCommands(stream)
        ) {
            return false;
        }

        stream.drawImage(
            -this.origin.x * this.size.x,
            -this.origin.y * this.size.y,
            this.size.x,
            this.size.y,
            this.#imageName,
            this.#repeat.x,
            this.#repeat.y,
            1,
            1,
        );

        return true;
    }
}

export interface E_ImageOptions extends EntityOptions, C_ImageOptions {}

export interface E_ImageJSON extends E_ImageOptions {
    type: 'image';
}

export class E_Image<TEngine extends Engine = Engine> extends Entity<TEngine> {
    #imageName: string;

    #image: C_Image<TEngine>;

    constructor(options: E_ImageOptions) {
        super(options);

        this.#imageName = options.imageName;

        this.#image = this.addComponent<C_Image<TEngine>>({
            ...options,
            type: 'image',
            name: 'Image',
        });
    }

    get imageName(): string {
        return this.#imageName;
    }

    set imageName(imageName: string) {
        this.#imageName = imageName;
        this.#image.imageName = imageName;
    }

    get image(): C_Image<TEngine> {
        return this.#image;
    }
}
