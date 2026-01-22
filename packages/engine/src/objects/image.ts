import { type C_RectangleCollider } from '../components/colliders/RectangleCollider';
import { C_Drawable, type C_DrawableOptions } from '../components/drawable';
import type { Engine } from '../engine';
import { Entity, type EntityOptions } from '../entities';
import { C_Collider, type C_ColliderOptions } from '../components/colliders';
import { Vector, type VectorConstructor } from '../math/vector';
import type { RenderCommandStream } from '../systems/render/command';

export interface C_ImageOptions extends C_DrawableOptions, C_ColliderOptions {
    imageName: string;
    repeat?: VectorConstructor;
}

export interface C_ImageJSON extends C_ImageOptions {
    type: 'image';
}

export class C_Image<
    TEngine extends Engine = Engine,
> extends C_Drawable<TEngine> {
    public static typeString: string = 'C_Image';

    #imageName: string;
    #repeat: Vector;

    constructor(options: C_ImageOptions) {
        super(options);

        this.#imageName = options.imageName;
        this.#repeat = new Vector(options.repeat ?? 1);
    }

    override get typeString(): string {
        return C_Image.typeString;
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

export interface E_ImageOptions extends EntityOptions, C_ImageOptions, C_ColliderOptions {
    collision?: boolean;
}

export interface E_ImageJSON extends E_ImageOptions {
    type: 'image';
}

export class E_Image<TEngine extends Engine = Engine> extends Entity<TEngine> {
    #image: C_Image<TEngine>;

    constructor(options: E_ImageOptions) {
        super(options);

        this.#image = this.addComponent<C_Image<TEngine>>({
            ...options,
            type: 'image',
            name: 'Image',
        });

        if (options.collision || options.pointerTarget) {
            this._collider = this.addComponent<C_RectangleCollider<TEngine>>({
                type: 'rectangleCollider',
                ...C_Collider.getCollisionOptionsForEntity(options),
            });
        }
    }

    get imageName(): string {
        return this.#image.imageName;
    }

    set imageName(imageName: string) {
        this.#image.imageName = imageName;
    }

    get image(): C_Image<TEngine> {
        return this.#image;
    }
}
