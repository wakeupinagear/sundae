import { DEFAULT_CAMERA_ID, DEFAULT_CANVAS_ID } from '../constants';
import { type Engine } from '../engine';
import { type IVector, Vector } from '../math/vector';
import { System } from './index';
import type { ButtonState } from './input';
import {
    SIGNAL_POINTER_SCREEN_X,
    SIGNAL_POINTER_SCREEN_Y,
} from './signal/constants';
import {
    SignalVariable,
    defaultNumberStringFormatter,
} from './signal/variable';

const DEFAULT_CURSOR_PRIORITY = 0;

export type CursorType =
    | 'default'
    | 'pointer'
    | 'crosshair'
    | 'grab'
    | 'grabbing'
    | 'move'
    | 'ew-resize'
    | 'ns-resize'
    | 'nwse-resize'
    | 'nesw-resize'
    | 'not-allowed'
    | 'none';

interface CursorRequest {
    type: CursorType;
    priority: number;
}

export type CameraScrollMode = 'none' | 'all' | 'meta' | 'no-meta';

export interface PointerButtonState extends ButtonState {
    clicked: boolean;
    clickCount: number;
    timeSinceLastClick: number;
}

export const PointerButton = {
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2,
} as const;
export type PointerButton = (typeof PointerButton)[keyof typeof PointerButton];
const POINTER_BUTTONS: PointerButton[] = [
    PointerButton.LEFT,
    PointerButton.MIDDLE,
    PointerButton.RIGHT,
];

export interface CanvasPointerState
    extends Record<PointerButton, PointerButtonState> {
    scrollDelta: number;
    justMoved: boolean;
    onScreen: boolean;
    justMovedOnScreen: boolean;
    justMovedOffScreen: boolean;
    screenPosition: Vector;
    position: Vector;
    clickStartPosition: Vector | null;
    clickEndPosition: Vector | null;
}

const DEFAULT_POINTER_BUTTON_STATE: PointerButtonState = {
    down: false,
    downAsNum: 0,
    pressed: false,
    released: false,
    downTime: 0,
    numHeldPresses: 0,
    clicked: false,
    clickCount: 0,
    timeSinceLastClick: 0,
};

const createCanvasPointerState = (): CanvasPointerState => ({
    screenPosition: new Vector(0),
    position: new Vector(0),
    justMovedOnScreen: false,
    justMovedOffScreen: false,
    clickStartPosition: null,
    clickEndPosition: null,
    scrollDelta: 0,
    justMoved: false,
    onScreen: false,
    [PointerButton.LEFT]: { ...DEFAULT_POINTER_BUTTON_STATE },
    [PointerButton.MIDDLE]: { ...DEFAULT_POINTER_BUTTON_STATE },
    [PointerButton.RIGHT]: { ...DEFAULT_POINTER_BUTTON_STATE },
});

export interface CanvasPointer {
    id: string;
    currentState: CanvasPointerState;
    prevState: CanvasPointerState;
    cursor: CursorType;
    cursorRequests: CursorRequest[];
}

export interface CameraPointer {
    canvasPointer: CanvasPointer;
    canvasID: string;
    accumulatedScrollDelta: number;
    scrollSteps: number;
    dragStartMousePosition: Vector | null;
    dragStartCameraPosition: Vector | null;
}

export interface I_PointerSystem {
    getPointerButton: (
        button: PointerButton,
        canvasID?: string,
    ) => PointerButtonState;
    getPointerButtonDown: (button: PointerButton, canvasID?: string) => boolean;
    getPointerButtonReleased: (
        button: PointerButton,
        canvasID?: string,
    ) => boolean;
    getPointerButtonClicked: (
        button: PointerButton,
        n?: number,
        canvasID?: string,
    ) => boolean;

    setPointerButtonDown: (
        button: PointerButton,
        down: boolean,
        canvasID?: string,
    ) => void;
    setPointerPosition: (position: IVector<number>, canvasID?: string) => void;
    setPointerOnScreen: (
        onScreen: boolean,
        position: IVector<number>,
        canvasID?: string,
    ) => void;
    setPointerScrollDelta: (delta: number, canvasID?: string) => void;

    capturePointerButtonClick: (
        button: PointerButton,
        canvasID?: string,
    ) => void;

    requestCursor: (
        type: CursorType,
        priority?: number,
        canvasID?: string,
    ) => void;
}

export class PointerSystem<TEngine extends Engine = Engine>
    extends System<TEngine>
    implements I_PointerSystem
{
    public static typeString: string = 'PointerSystem';

    #canvasPointers: Record<string, CanvasPointer> = {};
    #cameraPointers: Record<string, CameraPointer> = {};

    #pointerScreenX: SignalVariable<number>;
    #pointerScreenY: SignalVariable<number>;

    constructor(engine: TEngine) {
        super(engine);

        this.#pointerScreenX = new SignalVariable<number>(
            SIGNAL_POINTER_SCREEN_X,
            0,
            engine,
            { stringFormatter: defaultNumberStringFormatter },
        );
        this.#pointerScreenY = new SignalVariable<number>(
            SIGNAL_POINTER_SCREEN_Y,
            0,
            engine,
            { stringFormatter: defaultNumberStringFormatter },
        );
    }

    override get typeString(): string {
        return PointerSystem.typeString;
    }

    getCanvasPointer = (canvasID = DEFAULT_CANVAS_ID): CanvasPointer => {
        return this.#getCanvasPointer(canvasID);
    };

    getCameraPointer = (cameraID = DEFAULT_CAMERA_ID): CameraPointer => {
        return this.#getCameraPointer(cameraID);
    };

    getPointerButton(
        button: PointerButton,
        canvasID = DEFAULT_CANVAS_ID,
    ): PointerButtonState {
        return this.getCanvasPointer(canvasID).currentState[button];
    }

    getPointerButtonDown(
        button: PointerButton,
        canvasID = DEFAULT_CANVAS_ID,
    ): boolean {
        return this.getPointerButton(button, canvasID).down;
    }

    getPointerButtonReleased(
        button: PointerButton,
        canvasID = DEFAULT_CANVAS_ID,
    ): boolean {
        return this.getPointerButton(button, canvasID).released;
    }

    getPointerButtonClicked(
        button: PointerButton,
        n = 1,
        canvasID = DEFAULT_CANVAS_ID,
    ): boolean {
        const pointerButton = this.getPointerButton(button, canvasID);

        return pointerButton.clicked && pointerButton.clickCount == n;
    }

    setPointerButtonDown: I_PointerSystem['setPointerButtonDown'] = (
        button: PointerButton,
        down: boolean,
        canvasID = DEFAULT_CANVAS_ID,
    ) => {
        const pointer = this.#getCanvasPointer(canvasID);
        const buttonState = pointer.currentState[button];
        buttonState.down = down;
        buttonState.downAsNum = down ? 1 : 0;
        buttonState.downTime = 0;
        const position = pointer.currentState.position;
        if (down) {
            pointer.currentState.clickStartPosition = position.clone();
            pointer.currentState.clickEndPosition = null;
        } else {
            pointer.currentState.clickEndPosition = position;
        }
    };

    setPointerPosition: I_PointerSystem['setPointerPosition'] = (
        position,
        canvasID = DEFAULT_CANVAS_ID,
    ) => {
        const pointer = this.#getCanvasPointer(canvasID);
        pointer.currentState.position.set(position);
        const canvasSize = this._engine.getCanvasSize(canvasID);
        if (canvasSize) {
            this.setPointerOnScreen(
                position.x >= 0 &&
                    position.y >= 0 &&
                    position.x < canvasSize.x &&
                    position.y < canvasSize.y,
                position,
                canvasID,
            );
        }
    };

    setPointerOnScreen: I_PointerSystem['setPointerOnScreen'] = (
        onScreen,
        position,
        canvasID = DEFAULT_CANVAS_ID,
    ) => {
        const pointer = this.#getCanvasPointer(canvasID);
        const prevOnScreen = pointer.currentState.onScreen;
        if (prevOnScreen !== onScreen) {
            pointer.currentState.justMovedOnScreen = !prevOnScreen && onScreen;
            pointer.currentState.justMovedOffScreen = prevOnScreen && !onScreen;
            pointer.currentState.onScreen = onScreen;
            pointer.currentState.position.set(position);
        }
    };

    setPointerScrollDelta: I_PointerSystem['setPointerScrollDelta'] = (
        delta,
        canvasID = DEFAULT_CANVAS_ID,
    ) => {
        const pointer = this.#getCanvasPointer(canvasID);
        pointer.currentState.scrollDelta = delta;
    };

    requestCursor: I_PointerSystem['requestCursor'] = (
        type,
        priority = DEFAULT_CURSOR_PRIORITY,
        canvasID = DEFAULT_CANVAS_ID,
    ) => {
        const pointer = this.#getCanvasPointer(canvasID);
        pointer.cursorRequests.push({ type, priority });
    };

    override earlyUpdate(deltaTime: number) {
        const engineOptions = this._engine.options;
        for (const canvasID in this.#canvasPointers) {
            const pointer = this.#canvasPointers[canvasID]!;
            pointer.currentState.justMoved =
                pointer.currentState.position.x !==
                    pointer.prevState.position.x ||
                pointer.currentState.position.y !==
                    pointer.prevState.position.y;
            for (const button of POINTER_BUTTONS) {
                const currentState = pointer.currentState[button];
                currentState.pressed =
                    currentState.down && !pointer.prevState[button].down;
                currentState.released =
                    !currentState.down && pointer.prevState[button].down;
                currentState.clicked = false;
                currentState.timeSinceLastClick += deltaTime;

                if (
                    currentState.released &&
                    pointer.currentState.clickStartPosition &&
                    pointer.currentState.clickEndPosition
                ) {
                    const distanceTraveled =
                        pointer.currentState.clickEndPosition.distanceTo(
                            pointer.currentState.clickStartPosition,
                        );
                    if (
                        distanceTraveled <=
                        engineOptions.canvasClickDistanceThreshold
                    ) {
                        currentState.clicked = true;
                        if (
                            currentState.timeSinceLastClick <=
                            engineOptions.canvasMultiClickThreshold
                        ) {
                            currentState.clickCount++;
                        } else {
                            currentState.clickCount = 1;
                        }
                        currentState.timeSinceLastClick = 0;
                    }
                } else if (currentState.down) {
                    currentState.downTime += deltaTime;
                }
            }

            const position = pointer.currentState.position;
            pointer.prevState.scrollDelta = pointer.currentState.scrollDelta;
            pointer.prevState.justMoved = pointer.currentState.justMoved;
            pointer.prevState.onScreen = pointer.currentState.onScreen;
            pointer.prevState.justMovedOnScreen =
                pointer.currentState.justMovedOnScreen;
            pointer.prevState.justMovedOffScreen =
                pointer.currentState.justMovedOffScreen;
            pointer.prevState.clickStartPosition =
                pointer.currentState.clickStartPosition;
            pointer.prevState.clickEndPosition =
                pointer.currentState.clickEndPosition;
            pointer.prevState.screenPosition.set(
                pointer.currentState.screenPosition,
            );
            for (const button of POINTER_BUTTONS) {
                const prevButtonState = pointer.prevState[button];
                const currButtonState = pointer.currentState[button];
                prevButtonState.down = currButtonState.down;
                prevButtonState.downAsNum = currButtonState.downAsNum;
                prevButtonState.pressed = currButtonState.pressed;
                prevButtonState.released = currButtonState.released;
                prevButtonState.downTime = currButtonState.downTime;
                prevButtonState.numHeldPresses = currButtonState.numHeldPresses;
                prevButtonState.clicked = currButtonState.clicked;
                prevButtonState.clickCount = currButtonState.clickCount;
                prevButtonState.timeSinceLastClick =
                    currButtonState.timeSinceLastClick;
            }
            pointer.prevState.position.set(position);

            if (pointer.currentState.justMoved) {
                this.#pointerScreenX.set(position.x);
                this.#pointerScreenY.set(position.y);
            }
        }
    }

    override lateUpdate(): boolean | void {
        for (const canvasID in this.#canvasPointers) {
            const pointer = this.#canvasPointers[canvasID]!;
            this.#applyCanvasCursor(pointer, 'default');
        }
    }

    capturePointerButtonClick: I_PointerSystem['capturePointerButtonClick'] = (
        button,
        canvasID = DEFAULT_CANVAS_ID,
    ): void => {
        const pointer = this.#getCanvasPointer(canvasID);
        const buttonState = pointer.currentState[button];
        buttonState.clicked = false;
        buttonState.released = false;
        buttonState.pressed = false;
    };

    #getCanvasPointer(canvasID: string): CanvasPointer {
        if (!(canvasID in this.#canvasPointers)) {
            this.#canvasPointers[canvasID] = {
                id: canvasID,
                currentState: createCanvasPointerState(),
                prevState: createCanvasPointerState(),
                cursor: 'default',
                cursorRequests: [],
            };
        }

        return this.#canvasPointers[canvasID];
    }

    #getCameraPointer(cameraID: string): CameraPointer {
        const camera = this._engine.getCamera(cameraID);
        const canvasID = camera?.canvasID || DEFAULT_CANVAS_ID;
        const canvasPointer = this.#getCanvasPointer(canvasID);

        if (!(cameraID in this.#cameraPointers)) {
            this.#cameraPointers[cameraID] = {
                canvasPointer,
                canvasID,
                accumulatedScrollDelta: 0,
                scrollSteps: 0,
                dragStartMousePosition: null,
                dragStartCameraPosition: null,
            };
        } else {
            // Update canvas pointer reference if canvasID changed
            const existing = this.#cameraPointers[cameraID];
            if (existing.canvasID !== canvasID) {
                existing.canvasPointer = this.#getCanvasPointer(canvasID);
                existing.canvasID = canvasID;
            }
        }

        return this.#cameraPointers[cameraID];
    }

    #applyCanvasCursor(
        canvasPointer: CanvasPointer,
        fallbackCursor?: CursorType,
    ): void {
        const canvas = this._engine.getCanvas(canvasPointer.id);
        if (!canvas) {
            return;
        }

        canvasPointer.cursorRequests.sort((a, b) => b.priority - a.priority);
        const newCursor =
            canvasPointer.cursorRequests.length > 0
                ? canvasPointer.cursorRequests[0].type
                : fallbackCursor;
        canvasPointer.cursorRequests.length = 0;

        if (newCursor && newCursor !== canvasPointer.cursor) {
            canvasPointer.cursor = newCursor;
            this._engine.options.onCursorChange?.(newCursor, canvasPointer.id);
            if (canvas.style) {
                canvas.style.cursor = newCursor;
            }
        }
    }
}
