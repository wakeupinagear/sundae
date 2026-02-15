import type { BrowserKeyEvent, Engine, EngineOptions } from './engine';
import type { IVector } from './math/vector';
import type { AssetLoader } from './systems/asset/loader';
import { WorkerAssetLoader } from './systems/asset/loader/worker';
import type { CursorType, PointerButton } from './systems/pointer';
import { type EngineConstructor, createEngine } from './utils';

export const FromEngineMsgType = {
    INIT: 'init',
    SET_CANVAS_CURSOR: 'set_canvas_cursor',
    FRAME_COMPLETE: 'frame_complete',
    WORKER_LOAD_SVG_REQUEST: 'worker_load_svg_request',
} as const;
export type FromEngineMsgType =
    (typeof FromEngineMsgType)[keyof typeof FromEngineMsgType];

interface FromEngineMsg_Init {
    type: typeof FromEngineMsgType.INIT;
    cursor: CursorType;
}

interface FromEngineMsg_SetCanvasCursor {
    type: typeof FromEngineMsgType.SET_CANVAS_CURSOR;
    canvasID: string;
    cursor: CursorType;
}

interface FromEngineMsg_FrameComplete {
    type: typeof FromEngineMsgType.FRAME_COMPLETE;
}

interface FromEngineMsg_WorkerLoadSvgRequest {
    type: typeof FromEngineMsgType.WORKER_LOAD_SVG_REQUEST;
    src: string;
    name?: string;
    requestId: string;
}

export type FromEngineMsg =
    | FromEngineMsg_Init
    | FromEngineMsg_SetCanvasCursor
    | FromEngineMsg_FrameComplete
    | FromEngineMsg_WorkerLoadSvgRequest;

export const ToEngineMsgType = {
    TICK: 'tick',
    SET_CANVAS: 'set_canvas',
    SET_CANVAS_SIZE: 'set_canvas_size',
    SET_OPTIONS: 'set_options',
    ON_KEY_DOWN: 'on_key_down',
    ON_KEY_UP: 'on_key_up',
    RELEASE_ALL_KEYS: 'release_all_keys',
    ON_POINTER_MOVE: 'on_pointer_move',
    ON_WHEEL: 'on_wheel',
    ON_POINTER_DOWN: 'on_pointer_down',
    ON_POINTER_UP: 'on_pointer_up',
    ON_POINTER_ENTER: 'on_pointer_enter',
    ON_POINTER_LEAVE: 'on_pointer_leave',
    WORKER_LOAD_SVG_RESPONSE: 'worker_load_svg_response',
} as const;
export type ToEngineMsgType =
    (typeof ToEngineMsgType)[keyof typeof ToEngineMsgType];

interface ToEngineMsg_Tick {
    type: typeof ToEngineMsgType.TICK;
}

interface ToEngineMsg_SetCanvas {
    type: typeof ToEngineMsgType.SET_CANVAS;
    canvasID: string;
    canvas: OffscreenCanvas | null;
}

interface ToEngineMsg_SetCanvasSize {
    type: typeof ToEngineMsgType.SET_CANVAS_SIZE;
    canvasID: string;
    width: number;
    height: number;
}

interface ToEngineMsg_SetOptions {
    type: typeof ToEngineMsgType.SET_OPTIONS;
    options: Partial<EngineOptions>;
}

interface ToEngineMsg_OnKeyDown {
    type: typeof ToEngineMsgType.ON_KEY_DOWN;
    event: BrowserKeyEvent;
}

interface ToEngineMsg_OnKeyUp {
    type: typeof ToEngineMsgType.ON_KEY_UP;
    event: BrowserKeyEvent;
}

interface ToEngineMsg_ReleaseAllKeys {
    type: typeof ToEngineMsgType.RELEASE_ALL_KEYS;
}

interface ToEngineMsg_OnPointerMove {
    type: typeof ToEngineMsgType.ON_POINTER_MOVE;
    canvasID: string;
    position: IVector<number>;
}

interface ToEngineMsg_OnWheel {
    type: typeof ToEngineMsgType.ON_WHEEL;
    canvasID: string;
    delta: number;
}

interface ToEngineMsg_OnPointerDown {
    type: typeof ToEngineMsgType.ON_POINTER_DOWN;
    canvasID: string;
    button: PointerButton;
}

interface ToEngineMsg_OnPointerUp {
    type: typeof ToEngineMsgType.ON_POINTER_UP;
    canvasID: string;
    button: PointerButton;
}

interface ToEngineMsg_OnPointerEnter {
    type: typeof ToEngineMsgType.ON_POINTER_ENTER;
    canvasID: string;
    position: IVector<number>;
}

interface ToEngineMsg_OnPointerLeave {
    type: typeof ToEngineMsgType.ON_POINTER_LEAVE;
    canvasID: string;
    position: IVector<number>;
}

interface ToEngineMsg_WorkerLoadSvgResponse {
    type: typeof ToEngineMsgType.WORKER_LOAD_SVG_RESPONSE;
    requestId: string;
    imageBitmap: ImageBitmap | null;
}

export type ToEngineMsg =
    | ToEngineMsg_Tick
    | ToEngineMsg_SetCanvas
    | ToEngineMsg_SetCanvasSize
    | ToEngineMsg_SetOptions
    | ToEngineMsg_OnKeyDown
    | ToEngineMsg_OnKeyUp
    | ToEngineMsg_ReleaseAllKeys
    | ToEngineMsg_OnPointerMove
    | ToEngineMsg_OnWheel
    | ToEngineMsg_OnPointerDown
    | ToEngineMsg_OnPointerUp
    | ToEngineMsg_OnPointerEnter
    | ToEngineMsg_OnPointerLeave
    | ToEngineMsg_WorkerLoadSvgResponse;

interface RunEngineInWorkerOptions<
    TEngine extends Engine = Engine,
    TToEngineMsg = ToEngineMsg,
> {
    engine?: EngineConstructor<TEngine>;
    assetLoader?: AssetLoader;
    onEngineReady?: (engine: TEngine) => void;
    onMessage?: (event: MessageEvent<TToEngineMsg>, engine: TEngine) => void;
}

/** Only allow TToEngineMsg when it is a supertype of ToEngineMsg (e.g. ToEngineMsg | AppMsg). */
type RunEngineInWorkerOptionsWhenMsgSupertype<
    TEngine extends Engine,
    TToEngineMsg,
> = ToEngineMsg extends TToEngineMsg
    ? RunEngineInWorkerOptions<TEngine, TToEngineMsg>
    : never;

export type WorkerConstructor =
    | string
    | URL
    | (new (options?: { name?: string }) => Worker);

export const runEngineInWorker = <
    TEngine extends Engine = Engine,
    TToEngineMsg = ToEngineMsg,
>(
    options?: RunEngineInWorkerOptionsWhenMsgSupertype<TEngine, TToEngineMsg>,
) => {
    const engineInstance = createEngine<TEngine>(options?.engine, {
        engineOptions: {
            assetLoader: options?.assetLoader ?? new WorkerAssetLoader(),
        },
        isWorker: true,
    });
    engineInstance.options = {
        onCursorChange: (cursor, canvasID) => {
            self.postMessage({
                type: FromEngineMsgType.SET_CANVAS_CURSOR,
                canvasID,
                cursor,
            });
        },
        onReadyForNextFrame: () => {
            self.postMessage({ type: FromEngineMsgType.FRAME_COMPLETE });
        },
    };

    self.postMessage({ type: FromEngineMsgType.INIT });

    const onMessage = options?.onMessage;
    options?.onEngineReady?.(engineInstance);

    globalThis.onmessage = (event: MessageEvent<TToEngineMsg>) => {
        const data = event.data as ToEngineMsg;
        switch (data.type) {
            case ToEngineMsgType.TICK:
                engineInstance.startNextFrame();
                break;
            case ToEngineMsgType.SET_CANVAS:
                engineInstance.setCanvas(data.canvas, data.canvasID);
                break;
            case ToEngineMsgType.SET_CANVAS_SIZE: {
                const canvas = engineInstance.getCanvas(data.canvasID);
                if (canvas) {
                    canvas.width = data.width;
                    canvas.height = data.height;
                    engineInstance.forceRender();
                }
                break;
            }
            case ToEngineMsgType.SET_OPTIONS:
                engineInstance.options = data.options;
                break;
            case ToEngineMsgType.ON_KEY_DOWN:
                engineInstance.onKeyDown('keydown', data.event);
                break;
            case ToEngineMsgType.ON_KEY_UP:
                engineInstance.onKeyUp('keyup', data.event);
                break;
            case ToEngineMsgType.RELEASE_ALL_KEYS:
                engineInstance.releaseAllKeys();
                break;
            case ToEngineMsgType.ON_POINTER_MOVE:
                engineInstance.onPointerMove(
                    'pointermove',
                    data.canvasID,
                    data.position,
                );
                break;
            case ToEngineMsgType.ON_WHEEL:
                engineInstance.onWheel('wheel', data.canvasID, {
                    delta: data.delta,
                });
                break;
            case ToEngineMsgType.ON_POINTER_DOWN:
                engineInstance.onPointerDown('pointerdown', data.canvasID, {
                    button: data.button,
                });
                break;
            case ToEngineMsgType.ON_POINTER_UP:
                engineInstance.onPointerUp('pointerup', data.canvasID, {
                    button: data.button,
                });
                break;
            case ToEngineMsgType.ON_POINTER_ENTER:
                engineInstance.onPointerEnter(
                    'pointerenter',
                    data.canvasID,
                    data.position,
                );
                break;
            case ToEngineMsgType.ON_POINTER_LEAVE:
                engineInstance.onPointerLeave(
                    'pointerleave',
                    data.canvasID,
                    data.position,
                );
                break;
        }

        engineInstance.onWorkerMessage(event as MessageEvent<ToEngineMsg>);
        onMessage?.(event, engineInstance);
    };
};
