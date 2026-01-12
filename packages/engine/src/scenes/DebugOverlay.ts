import { C_Drawable, C_DrawableOptions } from '../components/drawable';
import { Engine } from '../engine';
import { Entity } from '../entities';
import { E_Text, E_TextOptions } from '../objects/text';
import type {
    RenderCommandStats,
    RenderCommandStream,
} from '../systems/render/command';
import type { RenderStyle } from '../systems/render/style';
import { Scene } from '../systems/scene';
import type { TraceFrame } from '../systems/stats';
import type { BoundingBox, CacheStats, Camera } from '../types';
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

    override queueRenderCommands(stream: RenderCommandStream, camera: Camera) {
        const stats = this._engine.stats;
        if (!stats) {
            return false;
        }

        const currentTime = performance.now();
        let text = `<size=${HEADER_SIZE}><bold>FPS: ${stats.fps}</bold></size>`;

        if (stats.traces.length > 0) {
            text += this.#buildTraceText(stats.traces, 0, '', currentTime);
        }

        if (stats.renderCommands) {
            text += this.#buildCacheText(stats.renderCommands);
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
            text = `\n\n${text}`;
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

    override queueRenderCommands(stream: RenderCommandStream): boolean {
        if (!super.queueRenderCommands(stream)) {
            return false;
        }

        stream.pushTransform(this._entity.transform.worldMatrix.inverse());
        for (const child of this._engine.rootEntity.children) {
            this.#drawEntityBoundingBox(child, stream);
        }
        stream.popTransform();

        this.#drawBoundingBox(this._engine.camera.cullBoundingBox, stream, {
            strokeStyle: 'blue',
            lineWidth: 4 / zoomToScale(this.engine.camera.zoom),
        });

        return true;
    }

    #drawEntityBoundingBox(
        entity: Readonly<Entity<TEngine>>,
        stream: RenderCommandStream,
        level = 0,
    ): void {
        if (!entity.enabled || entity.name === this.#sceneEntityName) return;

        const culled =
            entity.cull !== 'none' &&
            entity.isCulled(this._engine.camera.cullBoundingBox);
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
                this.#drawEntityBoundingBox(child, stream, level + 1);
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

    override queueRenderCommands(stream: RenderCommandStream): boolean {
        if (!super.queueRenderCommands(stream)) {
            return false;
        }

        stream.pushTransform(this._entity.transform.worldMatrix.inverse());
        for (const child of this._engine.rootEntity.children) {
            this.#drawEntityCollider(child, stream);
        }
        stream.popTransform();

        return true;
    }

    #drawEntityCollider(
        entity: Readonly<Entity<TEngine>>,
        stream: RenderCommandStream,
    ): void {
        if (!entity.enabled || entity.name === this.#sceneEntityName) return;

        const culled =
            entity.cull !== 'none' &&
            entity.isCulled(this._engine.camera.cullBoundingBox);
        if (culled && entity.cull === 'all') {
            return;
        }

        if (!culled && entity.collider) {
            const collider = entity.collider;
            const bbox = entity.transform.boundingBox;

            stream.setOpacity(1);
            stream.setStyle({
                strokeStyle: 'lime',
                lineWidth: 8 / zoomToScale(this.engine.camera.zoom),
            });

            if (collider.type === 'circle') {
                const width = bbox.x2 - bbox.x1;
                const height = bbox.y2 - bbox.y1;
                const centerX = (bbox.x1 + bbox.x2) / 2;
                const centerY = (bbox.y1 + bbox.y2) / 2;
                stream.drawEllipse(
                    centerX,
                    centerY,
                    centerX + width,
                    centerY + height,
                    1,
                    1,
                    1,
                    1,
                );
            } else if (collider.type === 'rectangle') {
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

            stream.setStyle({
                fillStyle: 'blue',
            });

            const bounds = collider.collisionBounds;
            for (const bound of bounds) {
                stream.drawEllipse(
                    bound.x,
                    bound.y,
                    bound.x + 10,
                    bound.y + 10,
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
                this.#drawEntityCollider(child, stream);
            }
        }
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
            sceneEntityName: sceneEntityName,
        });
        visualDebug.addComponent({
            type: C_BoundingBoxDebug,
            sceneEntityName: sceneEntityName,
        });

        this.createEntity({
            type: E_StatsDebug,
            name: 'Stats Debug',
            cull: 'none',
            positionRelativeToCamera: { x: 'end', y: 'end' },
            scaleRelativeToCamera: true,
            position: -24,
            trim: 'ends',
        });
    }
}
