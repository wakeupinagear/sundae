import { EngineWrapper } from '.';
import type { BrowserKeyEvent, Engine, EngineOptions } from '../engine';
import type { IVector } from '../math/vector';
import type { PointerButton } from '../systems/pointer';
import type { ToEngineMsg } from '../worker';

export class MainThreadWrapper<
    TEngine extends Engine = Engine,
    TToEngineMsg extends ToEngineMsg = ToEngineMsg,
> extends EngineWrapper<TEngine, TToEngineMsg> {
    #engine: TEngine;

    constructor(engine: TEngine) {
        super();

        this.#engine = engine;
    }

    override getEngine() {
        return this.#engine;
    }

    destroy() {
        this.#engine.destroy();
    }

    onKeyDown(event: BrowserKeyEvent) {
        this.#engine.onKeyDown('keydown', event);
    }

    onKeyUp(event: BrowserKeyEvent) {
        this.#engine.onKeyUp('keyup', event);
    }

    releaseAllKeys() {
        this.#engine.releaseAllKeys();
    }

    setOptions(options: Partial<EngineOptions>) {
        this.#engine.options = options;
    }

    setCanvas(canvas: HTMLCanvasElement | null, canvasID: string) {
        this.#engine.setCanvas(canvas, canvasID);
    }

    onPointerMove(canvasID: string, position: IVector<number>) {
        this.#engine.onPointerMove('pointermove', canvasID, position);
    }

    onWheel(canvasID: string, delta: number) {
        this.#engine.onWheel('wheel', canvasID, { delta });
    }

    onPointerDown(canvasID: string, button: PointerButton) {
        this.#engine.onPointerDown('pointerdown', canvasID, { button });
    }

    onPointerUp(canvasID: string, button: PointerButton) {
        this.#engine.onPointerUp('pointerup', canvasID, { button });
    }

    onPointerEnter(canvasID: string, position: IVector<number>) {
        this.#engine.onPointerEnter('pointerenter', canvasID, position);
    }

    onPointerLeave(canvasID: string, position: IVector<number>) {
        this.#engine.onPointerLeave('pointerleave', canvasID, position);
    }

    setCanvasSize() {
        // No-op
    }

    sendMessage() {
        // No-op
    }
}
