import { EngineWrapper } from '.';
import type { BrowserKeyEvent, Engine, EngineOptions } from '../engine';
import type { IVector } from '../math/vector';
import type { PointerButton } from '../systems/pointer';
import {
    type FromEngineMsg,
    FromEngineMsgType,
    type ToEngineMsg,
    ToEngineMsgType,
    type WorkerConstructor
} from '../worker';

export class WorkerWrapper<
    TEngine extends Engine = Engine,
    TToEngineMsg extends ToEngineMsg = ToEngineMsg,
> extends EngineWrapper<TEngine, TToEngineMsg> {
    #worker: Worker;

    #engineInitialized: boolean = false;
    #queuedMessages: [ToEngineMsg, Transferable[]][] = [];
    #rafId: number = -1;
    #waitingForFrame: boolean = false;
    #canvases: Record<string, HTMLCanvasElement | null> = {};

    constructor(workerConstructor: WorkerConstructor) {
        super();

        this.#worker =
            typeof workerConstructor === 'string' ||
            workerConstructor instanceof URL
                ? new Worker(workerConstructor, { type: 'module' })
                : new workerConstructor();

        this.#worker.onmessage = (event: MessageEvent<FromEngineMsg>) => {
            switch (event.data.type) {
                case FromEngineMsgType.INIT:
                    this.#engineInitialized = true;
                    for (const [message, transfer] of this.#queuedMessages) {
                        this.#worker?.postMessage(message, transfer);
                    }
                    this.#queuedMessages = [];
                    this.#sendNextTick();
                    break;
                case FromEngineMsgType.FRAME_COMPLETE:
                    this.#waitingForFrame = false;
                    this.#sendNextTick();
                    break;
                case FromEngineMsgType.SET_CANVAS_CURSOR: {
                    const canvas = this.#canvases[event.data.canvasID];
                    if (canvas?.style) {
                        canvas.style.cursor = event.data.cursor;
                    }
                    break;
                }
            }
        };
    }

    destroy() {
        if (this.#rafId !== -1) {
            cancelAnimationFrame(this.#rafId);
            this.#rafId = -1;
        }
        this.#worker.terminate();
    }

    setOptions(options: Partial<EngineOptions>) {
        this.sendMessage({
            type: ToEngineMsgType.SET_OPTIONS,
            options,
        });
    }

    setCanvas(canvas: HTMLCanvasElement | null, canvasID: string) {
        if (canvas) {
            this.#canvases[canvasID] = canvas;
        } else {
            delete this.#canvases[canvasID];
        }

        const offscreen = canvas?.transferControlToOffscreen() || null;
        this.sendMessage(
            { type: ToEngineMsgType.SET_CANVAS, canvasID, canvas: offscreen },
            offscreen ? [offscreen] : [],
        );
    }

    onKeyDown(event: BrowserKeyEvent) {
        this.sendMessage({
            type: ToEngineMsgType.ON_KEY_DOWN,
            event,
        });
    }

    onKeyUp(event: BrowserKeyEvent) {
        this.sendMessage({
            type: ToEngineMsgType.ON_KEY_UP,
            event,
        });
    }

    releaseAllKeys() {
        this.sendMessage({
            type: ToEngineMsgType.RELEASE_ALL_KEYS,
        });
    }

    onPointerMove(canvasID: string, position: IVector<number>) {
        this.sendMessage({
            type: ToEngineMsgType.ON_POINTER_MOVE,
            canvasID,
            position,
        });
    }

    onWheel(canvasID: string, delta: number) {
        this.sendMessage({
            type: ToEngineMsgType.ON_WHEEL,
            canvasID,
            delta,
        });
    }

    onPointerDown(canvasID: string, button: PointerButton) {
        this.sendMessage({
            type: ToEngineMsgType.ON_POINTER_DOWN,
            canvasID,
            button,
        });
    }

    onPointerUp(canvasID: string, button: PointerButton) {
        this.sendMessage({
            type: ToEngineMsgType.ON_POINTER_UP,
            canvasID,
            button,
        });
    }

    onPointerEnter(canvasID: string, position: IVector<number>) {
        this.sendMessage({
            type: ToEngineMsgType.ON_POINTER_ENTER,
            canvasID,
            position,
        });
    }

    onPointerLeave(canvasID: string, position: IVector<number>) {
        this.sendMessage({
            type: ToEngineMsgType.ON_POINTER_LEAVE,
            canvasID,
            position,
        });
    }

    setCanvasSize(canvasID: string, width: number, height: number) {
        this.sendMessage({
            type: ToEngineMsgType.SET_CANVAS_SIZE,
            canvasID,
            width,
            height,
        });
    }

    sendMessage(
        message: TToEngineMsg | ToEngineMsg,
        transfer: Transferable[] = [],
    ) {
        if (this.#engineInitialized) {
            this.#worker?.postMessage(message, transfer);
        } else {
            this.#queuedMessages.push([message, transfer]);
        }
    }

    #sendNextTick() {
        if (this.#waitingForFrame || !this.#engineInitialized) {
            return;
        }

        this.#waitingForFrame = true;
        this.sendMessage({ type: ToEngineMsgType.TICK });
    }
}
