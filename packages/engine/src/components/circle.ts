import type { Engine } from '../engine';
import type { CameraSystem } from '../systems/camera';
import type { RenderCommandStream } from '../systems/render/command';
import { C_ShapeBase, type C_ShapeBaseOptions } from './shape';

export interface C_CircleOptions extends C_ShapeBaseOptions {}

export interface C_CircleJSON extends C_CircleOptions {
    type: 'circle';
}

export class C_Circle<TEngine extends Engine = Engine> extends C_ShapeBase<TEngine> {
    public static typeString: string = 'C_Circle';

    constructor(options: C_CircleOptions) {
        super(options, 'circle');
    }

    override get typeString(): string {
        return C_Circle.typeString;
    }

    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): boolean {
        if (!super.queueRenderCommands(stream, camera)) {
            return false;
        }

        const centerX =
            (-1 - (this._size.x - 1)) * this._origin.x + this._size.x / 2;
        const centerY =
            (-1 - (this._size.y - 1)) * this._origin.y + this._size.y / 2;
        const x1 = centerX;
        const y1 = centerY;
        const x2 = centerX + this._size.x;
        const y2 = centerY + this._size.y;
        stream.drawEllipse(
            x1,
            y1,
            x2,
            y2,
            this.repeat.x,
            this.repeat.y,
            this.gap.x,
            this.gap.y,
        );

        this._onFinishQueueRenderCommands(stream);
        return true;
    }
}
