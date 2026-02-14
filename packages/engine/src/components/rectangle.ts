import type { Engine } from '../engine';
import type { CameraSystem } from '../systems/camera';
import type { RenderCommandStream } from '../systems/render/command';
import { C_ShapeBase, type C_ShapeBaseOptions } from './shape';

export interface C_RectangleOptions extends C_ShapeBaseOptions {}

export interface C_RectangleJSON extends C_RectangleOptions {
    type: 'rectangle';
}

export class C_Rectangle<TEngine extends Engine = Engine> extends C_ShapeBase<TEngine> {
    public static typeString: string = 'C_Rectangle';

    constructor(options: C_RectangleOptions) {
        super(options, 'rectangle');
    }

    override get typeString(): string {
        return C_Rectangle.typeString;
    }

    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): boolean {
        if (!super.queueRenderCommands(stream, camera)) {
            return false;
        }

        stream.drawRect(
            (-1 - (this._size.x - 1)) * this._origin.x,
            (-1 - (this._size.y - 1)) * this._origin.y,
            this._size.x,
            this._size.y,
            this.repeat.x,
            this.repeat.y,
            this.gap.x,
            this.gap.y,
        );

        this._onFinishQueueRenderCommands(stream);
        return true;
    }
}
