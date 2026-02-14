import { type C_ColliderOptions } from '../components/colliders';
import { C_Drawable, type C_DrawableOptions } from '../components/drawable';
import type { Engine } from '../engine';
import { Vector, type VectorConstructor } from '../math/vector';
import type { CameraSystem } from '../systems/camera';
import type { RenderCommandStream } from '../systems/render/command';

export interface C_ImageOptions extends C_DrawableOptions, C_ColliderOptions {
    image: string;
    repeat?: VectorConstructor;
}

export interface C_ImageJSON extends C_ImageOptions {
    type: 'image';
}

export class C_Image<
    TEngine extends Engine = Engine,
> extends C_Drawable<TEngine> {
    public static typeString: string = 'C_Image';

    #image: string;
    #repeat: Vector;

    constructor(options: C_ImageOptions) {
        super(options);

        this.#image = options.image;
        this.#repeat = new Vector(options.repeat ?? 1);
    }

    override get typeString(): string {
        return C_Image.typeString;
    }

    get image(): string {
        return this.#image;
    }

    set image(image: string) {
        this.#image = image;
    }

    get repeat(): Vector {
        return this.#repeat;
    }

    set repeat(repeat: VectorConstructor | null) {
        this.#repeat = new Vector(repeat ?? 1);
    }

    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): boolean {
        if (
            !this._entity ||
            !this.#image ||
            !super.queueRenderCommands(stream, camera)
        ) {
            return false;
        }

        stream.drawImage(
            -this.origin.x * this.size.x,
            -this.origin.y * this.size.y,
            this.size.x,
            this.size.y,
            this.#image,
            this.#repeat.x,
            this.#repeat.y,
            1,
            1,
        );

        this._onFinishQueueRenderCommands(stream);

        return true;
    }
}
