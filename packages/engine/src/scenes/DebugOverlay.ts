import { type C_CircleCollider } from '../components/colliders/CircleCollider';
import { C_Drawable, type C_DrawableOptions } from '../components/drawable';
import { type Engine } from '../engine';
import { Entity, type EntityOptions } from '../entities';
import type { BoundingBox } from '../math/boundingBox';
import { E_Text, type E_TextOptions } from '../objects/text';
import type { CameraSystem } from '../systems/camera';
import type {
    RenderCommandStats,
    RenderCommandStream,
} from '../systems/render/command';
import type { RenderStyle } from '../systems/render/style';
import { Scene } from '../systems/scene';
import type { TraceFrame } from '../systems/stats';
import type { CacheStats } from '../types';
import { zoomToScale } from '../utils';

const IMPORTANT_TRACE_THRESHOLD = 0.2;
const IMPORTANT_TRACE_STALE_TIME = 5000;

const HEADER_SIZE = 16;
const LABEL_COLOR = '#CCCCCC';

export class E_StatsDebug<
    TEngine extends Engine = Engine,
> extends E_Text<TEngine> {
    #importantTraces: Map<string, number> = new Map();

    constructor(options: E_TextOptions) {
        super({
            ...options,
            text: '',
        });
    }

    override update(): boolean {
        // Force render loop while this entity exists
        return true;
    }

    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ) {
        const stats = this._engine.stats;
        if (!stats) {
            return false;
        }

        const currentTime = performance.now();
        let text = `<size=${HEADER_SIZE}><bold>FPS: ${stats.fps}</bold></size>`;

        let textContent = '';
        if (stats.traces.length > 0) {
            textContent += this.#buildTraceText(
                stats.traces,
                0,
                '',
                currentTime,
            );
        }
        if (stats.renderCommands) {
            textContent += this.#buildCacheText(stats.renderCommands);
        }

        const spatialStats = this._engine.physicsSystem.spatialGridStats;
        if (spatialStats.entityCount > 0) {
            textContent += `\n<color=${LABEL_COLOR}>Spatial Grid:</color>`;
            textContent += `\n  <color=${LABEL_COLOR}>Entities:</color> <bold>${spatialStats.entityCount}</bold>`;
            textContent += `\n  <color=${LABEL_COLOR}>Cells:</color> <bold>${spatialStats.cellCount}</bold>`;
            textContent += `\n  <color=${LABEL_COLOR}>Avg/Cell:</color> <bold>${spatialStats.avgEntitiesPerCell.toFixed(1)}</bold>`;
            textContent += `\n  <color=${LABEL_COLOR}>Max/Cell:</color> <bold>${spatialStats.maxEntitiesInCell}</bold>`;
        }

        if (textContent) {
            text += `\n${textContent}`;
        }

        this.text = text;

        super.queueRenderCommands(stream, camera);
    }

    #buildTraceText(
        traces: ReadonlyArray<TraceFrame>,
        depth: number,
        parentName: string,
        currentTime: number,
    ): string {
        let text = '';

        for (const trace of traces) {
            const name = trace.name;
            const { subFrames, time, numCalls = 1 } = trace;

            const key = (parentName ? `${parentName} > ${name}` : name).split(
                '(',
            )[0];
            if (depth > 0) {
                if (time >= IMPORTANT_TRACE_THRESHOLD) {
                    this.#importantTraces.set(key, currentTime);
                } else {
                    const lastTime = this.#importantTraces.get(key);
                    if (
                        !lastTime ||
                        currentTime - lastTime > IMPORTANT_TRACE_STALE_TIME
                    ) {
                        this.#importantTraces.delete(key);
                        continue;
                    }
                }
            }

            const padding = ' '.repeat(depth * 2);
            const traceText = `<color=${LABEL_COLOR}>${name}${numCalls > 1 ? ` (${numCalls})` : ''}:</color> <bold>${time.toFixed(1)}ms</bold>`;
            text += padding + traceText + '\n';

            if (subFrames.length > 0) {
                text += this.#buildTraceText(
                    subFrames,
                    depth + 1,
                    name,
                    currentTime,
                );
            }
        }

        if (text && depth === 0) {
            text = `\n${text}`;
        }

        return text;
    }

    #buildCacheText(stats: Readonly<RenderCommandStats>) {
        let text = '';
        text += this.#buildCacheTextEntry('transform', stats.transform);
        text += this.#buildCacheTextEntry('setStyle', stats.setStyle);
        text += this.#buildCacheTextEntry('setOpacity', stats.setOpacity);
        text += this.#buildCacheTextEntry('drawRect', stats.drawRect);
        text += this.#buildCacheTextEntry('drawEllipse', stats.drawEllipse);
        text += this.#buildCacheTextEntry('drawLine', stats.drawLine);
        text += this.#buildCacheTextEntry('drawImage', stats.drawImage);
        text += this.#buildCacheTextEntry('drawText', stats.drawText);
        if (text) {
            text = `\n${text}`;
        }

        return text;
    }

    #buildCacheTextEntry(name: string, stats: CacheStats): string {
        if (stats.total === 0) return '';
        const cachedPercent =
            stats.cached > 0
                ? ` (${((stats.cached / (stats.total + stats.cached)) * 100).toFixed(1)}% cached)`
                : '';
        return `<color=${LABEL_COLOR}>${name}:</color> <bold>${stats.total}${cachedPercent}</bold>\n`;
    }
}

interface BoundingBoxDebugOptions extends C_DrawableOptions {
    sceneEntityName: string;
}

export class C_BoundingBoxDebug<
    TEngine extends Engine = Engine,
> extends C_Drawable<TEngine> {
    #sceneEntityName: string;

    constructor(options: BoundingBoxDebugOptions) {
        const { name = 'boundingBoxDebug', ...rest } = options;
        super({ name, ...rest });

        const { sceneEntityName } = options;
        this.#sceneEntityName = sceneEntityName;
    }

    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): boolean {
        if (!super.queueRenderCommands(stream, camera)) {
            return false;
        }

        stream.pushTransform(this._entity.transform.worldMatrix.inverse());
        for (const child of this._engine.rootEntity.children) {
            this.#drawEntityBoundingBox(child, stream, camera);
        }
        stream.popTransform();

        this.#drawBoundingBox(camera.cullBoundingBox, stream, {
            strokeStyle: 'blue',
            lineWidth: 4 / zoomToScale(camera.zoom),
        });

        return true;
    }

    #drawEntityBoundingBox(
        entity: Readonly<Entity<TEngine>>,
        stream: RenderCommandStream,
        camera: CameraSystem,
        level = 0,
    ): void {
        if (!entity.enabled || entity.name === this.#sceneEntityName) return;

        const culled =
            entity.cull !== 'none' && entity.isCulled(camera.cullBoundingBox);
        if (culled && entity.cull === 'all') {
            return;
        }

        if (!culled) {
            this.#drawBoundingBox(entity.transform.boundingBox, stream, {
                strokeStyle: `rgba(255, 0, 0, ${1 - level * 0.05})`,
                fillStyle: '',
                lineWidth: 1,
            });
        }

        const cullChildren = culled && entity.cull === 'components';
        if (!cullChildren) {
            for (const child of entity.children) {
                this.#drawEntityBoundingBox(child, stream, camera, level + 1);
            }
        }
    }

    #drawBoundingBox(
        bbox: BoundingBox,
        stream: RenderCommandStream,
        style: RenderStyle,
    ): void {
        stream.setOpacity(1);
        stream.setStyle(style);
        stream.drawRect(
            bbox.x1,
            bbox.y1,
            bbox.x2 - bbox.x1,
            bbox.y2 - bbox.y1,
            1,
            1,
            1,
            1,
        );
    }
}

interface ColliderDebugOptions extends C_DrawableOptions {
    sceneEntityName: string;
}

export class C_ColliderDebug<
    TEngine extends Engine = Engine,
> extends C_Drawable<TEngine> {
    #sceneEntityName: string;

    constructor(options: ColliderDebugOptions) {
        const { name = 'colliderDebug', ...rest } = options;
        super({ name, ...rest });

        const { sceneEntityName } = options;
        this.#sceneEntityName = sceneEntityName;
    }

    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): boolean {
        if (!super.queueRenderCommands(stream, camera)) {
            return false;
        }

        stream.pushTransform(this._entity.transform.worldMatrix.inverse());
        for (const child of this._engine.rootEntity.children) {
            this.#drawEntityCollider(child, stream, camera);
        }
        stream.popTransform();

        return true;
    }

    #drawEntityCollider(
        entity: Readonly<Entity<TEngine>>,
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): void {
        if (!entity.enabled || entity.name === this.#sceneEntityName) return;

        const culled =
            entity.cull !== 'none' && entity.isCulled(camera.cullBoundingBox);
        if (culled && entity.cull === 'all') {
            return;
        }

        if (!culled && entity.collider) {
            const collider = entity.collider;
            const bbox = entity.transform.boundingBox;

            stream.setOpacity(collider.isTrigger ? 0.5 : 1);
            stream.setStyle({
                strokeStyle: 'lime',
                lineWidth: 4 / zoomToScale(camera.zoom),
            });

            if (collider.type === 'circle') {
                const circleCollider = collider as C_CircleCollider<TEngine>;
                const radius = circleCollider.radius;
                const centerX = (bbox.x1 + bbox.x2) / 2;
                const centerY = (bbox.y1 + bbox.y2) / 2;
                stream.drawEllipse(
                    centerX,
                    centerY,
                    centerX + radius * 2,
                    centerY + radius * 2,
                    1,
                    1,
                    1,
                    1,
                );
            } else if (collider.type === 'rectangle') {
                const bounds = collider.collisionBounds;
                for (let i = 0; i < bounds.length + 1; i++) {
                    const point1 = bounds[i % bounds.length];
                    const point2 = bounds[(i + 1) % bounds.length];
                    stream.drawLine(
                        point1.x,
                        point1.y,
                        point2.x,
                        point2.y,
                        1,
                        1,
                        1,
                        1,
                    );
                }
            }

            stream.setStyle({
                fillStyle: 'blue',
            });

            const bounds = collider.collisionBounds;
            for (const bound of bounds) {
                stream.drawEllipse(
                    bound.x,
                    bound.y,
                    bound.x + 8,
                    bound.y + 8,
                    1,
                    1,
                    1,
                    1,
                );
            }
        }

        const cullChildren = culled && entity.cull === 'components';
        if (!cullChildren) {
            for (const child of entity.children) {
                this.#drawEntityCollider(child, stream, camera);
            }
        }
    }
}

class C_RaycastDebug<
    TEngine extends Engine = Engine,
> extends C_Drawable<TEngine> {
    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): boolean {
        if (!super.queueRenderCommands(stream, camera)) {
            return false;
        }

        const raycasts = this._engine.physicsSystem.raycastsThisFrame;
        if (raycasts.length) {
            stream.setOpacity(1);
            for (const raycast of raycasts) {
                stream.setStyle({
                    strokeStyle: 'red',
                    lineWidth: 2,
                });
                stream.drawLine(
                    raycast.request.origin.x,
                    raycast.request.origin.y,
                    raycast.request.origin.x +
                        raycast.request.direction.x *
                            raycast.request.maxDistance,
                    raycast.request.origin.y +
                        raycast.request.direction.y *
                            raycast.request.maxDistance,
                    1,
                    1,
                    1,
                    1,
                );

                if (raycast.result) {
                    stream.setStyle({
                        fillStyle: 'yellow',
                        strokeStyle: 'green',
                        lineWidth: 2,
                    });
                    stream.drawEllipse(
                        raycast.result.point.x,
                        raycast.result.point.y,
                        raycast.result.point.x + 10,
                        raycast.result.point.y + 10,
                        1,
                        1,
                        1,
                        1,
                    );
                }
            }
        }

        return true;
    }
}

const MOUSE_HALF_AXIS = 12;

class E_MouseDebug<TEngine extends Engine = Engine> extends Entity<TEngine> {
    constructor(options: EntityOptions) {
        super(options);

        this.addComponents(
            {
                type: 'shape',
                shape: 'LINE',
                start: { x: -MOUSE_HALF_AXIS, y: 0 },
                end: { x: MOUSE_HALF_AXIS, y: 0 },
                style: { strokeStyle: 'blue', lineWidth: 2 },
            },
            {
                type: 'shape',
                shape: 'LINE',
                start: { x: 0, y: -MOUSE_HALF_AXIS },
                end: { x: 0.5, y: MOUSE_HALF_AXIS },
                style: { strokeStyle: 'blue', lineWidth: 2 },
            },
        );
    }

    update(): boolean | void {
        const pointerState = this._engine.getCanvasPointer();
        const worldPosition = this._engine.screenToWorld(
            pointerState.currentState.position,
        );
        if (worldPosition && pointerState.currentState.onScreen) {
            this.setPosition(worldPosition);
            this.setOpacity(1);
        } else {
            this.setOpacity(0);
        }

        return true;
    }
}

export class DebugOverlayScene<
    TEngine extends Engine = Engine,
> extends Scene<TEngine> {
    override create(): void {
        const sceneEntityName = this.rootEntity.name;

        const visualDebug = this.createEntity({
            name: 'visualDebug',
            cull: 'none',
        });
        visualDebug.addComponent({
            type: C_ColliderDebug,
            name: 'colliderDebug',
            sceneEntityName: sceneEntityName,
        });
        visualDebug.addComponent({
            type: C_BoundingBoxDebug,
            name: 'boundingBoxDebug',
            sceneEntityName: sceneEntityName,
        });
        visualDebug.addComponent({
            type: C_RaycastDebug,
            name: 'raycastDebug',
        });

        this.createEntity({
            type: E_MouseDebug,
            name: 'mouseDebug',
        });

        this.createEntity({
            type: E_StatsDebug,
            name: 'Stats Debug',
            cull: 'none',
            positionRelativeToCamera: { x: 'end', y: 'end' },
            scaleRelativeToCamera: true,
            trim: 'ends',
            padding: 12,
            background: true,
        });
    }
}
