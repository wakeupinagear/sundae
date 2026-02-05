import { EngineWrapper } from '.';
import type { BrowserKeyEvent, Engine, EngineOptions } from '../engine';
import type { IVector } from '../math/vector';
import type { PointerButton } from '../systems/pointer';
import {
    type FromEngineMsg,
    FromEngineMsgType,
    type ToEngineMsg,
    ToEngineMsgType,
} from '../worker';

export class WorkerWrapper<
    TEngine extends Engine = Engine,
    TToEngineMsg extends ToEngineMsg = ToEngineMsg,
> extends EngineWrapper<TEngine, TToEngineMsg> {
    #worker: Worker;

    #engineInitialized: boolean = false;
    #queuedMessages: [ToEngineMsg, Transferable[]][] = [];
    #rafId: number = -1;

    constructor(workerURL: string | URL) {
        super();

        this.#worker = new Worker(workerURL, { type: 'module' });
        this.#worker.onmessage = (event: MessageEvent<FromEngineMsg>) => {
            this.#handleMessage(event.data);
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

    #handleMessage(message: FromEngineMsg) {
        switch (message.type) {
            case FromEngineMsgType.INIT:
                this.#engineInitialized = true;
                for (const [message, transfer] of this.#queuedMessages) {
                    this.#worker?.postMessage(message, transfer);
                }
                this.#queuedMessages = [];
                this.#startAnimationLoop();
                break;
        }
    }

    #startAnimationLoop() {
        const tick = () => {
            this.#rafId = requestAnimationFrame(tick);
            this.sendMessage({ type: ToEngineMsgType.TICK });
        };
        this.#rafId = requestAnimationFrame(tick);
    }
}
