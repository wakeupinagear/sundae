import { E_Shape, type E_ShapeOptions } from '.';
import type { Engine } from '../../engine';
import {
    type IVector,
    Vector,
    type VectorConstructor,
} from '../../math/vector';
import type { CameraSystem } from '../../systems/camera';
import type { RenderCommandStream } from '../../systems/render/command';

export interface E_InfiniteShapeOptions extends E_ShapeOptions {
    tileSize: VectorConstructor;
    offset?: VectorConstructor;
    infiniteAxes?: Partial<IVector<boolean>>;
}

export interface E_InfiniteShapeJSON extends E_InfiniteShapeOptions {
    type: 'infinite_shape';
}

interface RepeatState {
    position: Vector;
    repeat: Vector;
    enabled: boolean;
    hash: string | null;
}

export class E_InfiniteShape<
    TEngine extends Engine = Engine,
> extends E_Shape<TEngine> {
    #tileSize: Vector;
    #offset: Vector;
    #infiniteAxes: IVector<boolean>;

    #position: Vector | null = null; // Overrides the transform

    #cameraRepeatStates: Record<string, RepeatState> = {};

    constructor(options: E_InfiniteShapeOptions) {
        const {
            name = 'infinite_shape',
            scale: _scale,
            tileSize: _tileSize,
            ...rest
        } = options;

        const scale = _scale ?? _tileSize;
        const tileSize = _tileSize ?? scale;

        super({ name, cull: 'none', scale, ...rest });

        this.#tileSize = new Vector(tileSize);
        this.#offset = new Vector(options.offset ?? 0);
        this.#infiniteAxes = {
            x: options.infiniteAxes?.x ?? true,
            y: options.infiniteAxes?.y ?? true,
        };
        if (!options.gap) {
            this.shape.setGap(new Vector(options.tileSize).div(this.scale));
        }
    }

    get tileSize(): Vector {
        return this.#tileSize;
    }

    set tileSize(tileSize: VectorConstructor) {
        this.#tileSize.set(tileSize);
    }

    get offset(): Vector {
        return this.#offset;
    }

    set offset(offset: VectorConstructor) {
        this.#offset.set(offset);
    }

    get infiniteAxes(): IVector<boolean> {
        return this.#infiniteAxes;
    }

    set infiniteAxes(infiniteAxes: Partial<IVector<boolean>>) {
        this.#infiniteAxes.x = infiniteAxes.x ?? this.#infiniteAxes.x;
        this.#infiniteAxes.y = infiniteAxes.y ?? this.#infiniteAxes.y;
    }

    override setPosition(position: VectorConstructor): this {
        this.#position = position ? new Vector(position) : null;

        return this;
    }

    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ) {
        let stateRepeat = this.#cameraRepeatStates[camera.id];
        if (!stateRepeat) {
            stateRepeat = {
                position: new Vector(0),
                repeat: new Vector(1),
                enabled: false,
                hash: null,
            };
            this.#cameraRepeatStates[camera.id] = stateRepeat;
        }
        if (stateRepeat.hash !== camera.transformHash) {
            this.#calculateRepeat(camera, stateRepeat);
            stateRepeat.hash = camera.transformHash;
        }

        if (stateRepeat.enabled) {
            super.setPosition(stateRepeat.position);
            this.shape.setRepeat(stateRepeat.repeat);
            this.shape.setEnabled(true);
        } else {
            this.shape.setEnabled(false);
        }

        return super.queueRenderCommands(stream, camera);
    }

    #calculateRepeat(camera: CameraSystem, state: RepeatState) {
        const tileSizeX = Math.max(this.#tileSize.x, 1),
            tileSizeY = Math.max(this.#tileSize.y, 1);
        if (!this.isCulled(camera)) {
            const bbox = camera.boundingBox;
            const minX = bbox.x1;
            const maxX = bbox.x2;
            const minY = bbox.y1;
            const maxY = bbox.y2;

            const gridTopLeft = {
                    x: Math.floor((minX - tileSizeX / 2) / tileSizeX),
                    y: Math.floor((minY - tileSizeY / 2) / tileSizeY),
                },
                gridBottomRight = {
                    x: Math.floor((maxX + tileSizeX / 2) / tileSizeX),
                    y: Math.floor((maxY + tileSizeY / 2) / tileSizeY),
                };

            state.position.set(
                this.#infiniteAxes.x
                    ? gridTopLeft.x * tileSizeX + tileSizeX / 2 + this.#offset.x
                    : this.#position
                      ? this.#position.x
                      : 0,
                this.#infiniteAxes.y
                    ? gridTopLeft.y * tileSizeY + tileSizeY / 2 + this.#offset.y
                    : this.#position
                      ? this.#position.y
                      : 0,
            );

            state.repeat.set(
                this.#infiniteAxes.x
                    ? Math.abs(gridTopLeft.x - gridBottomRight.x) + 1
                    : 1,
                this.#infiniteAxes.y
                    ? Math.abs(gridTopLeft.y - gridBottomRight.y) + 1
                    : 1,
            );
            state.enabled = true;
        } else {
            state.enabled = false;
        }
    }

    override isCulled(camera: CameraSystem): boolean {
        return this.isLODCulled(camera);
    }
}
