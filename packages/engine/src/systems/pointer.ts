import { DEFAULT_CAMERA_ID, DEFAULT_CANVAS_ID } from '../constants';
import { type Engine } from '../engine';
import { type IVector, Vector } from '../math/vector';
import { System } from './index';
import type { ButtonState } from './input';

const MAX_DISTANCE_DURING_CLICK = 10;

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
}

export const PointerButton = {
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2,
} as const;
export type PointerButton = (typeof PointerButton)[keyof typeof PointerButton];

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
    [PointerButton.LEFT]: {
        down: false,
        downAsNum: 0,
        pressed: false,
        released: false,
        clicked: false,
        downTime: 0,
        numHeldPresses: 0,
    },
    [PointerButton.MIDDLE]: {
        down: false,
        downAsNum: 0,
        pressed: false,
        released: false,
        clicked: false,
        downTime: 0,
        numHeldPresses: 0,
    },
    [PointerButton.RIGHT]: {
        down: false,
        downAsNum: 0,
        pressed: false,
        released: false,
        clicked: false,
        downTime: 0,
        numHeldPresses: 0,
    },
});

export interface CanvasPointer {
    currentState: CanvasPointerState;
    prevState: CanvasPointerState;
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
}

export class PointerSystem<TEngine extends Engine = Engine>
    extends System<TEngine>
    implements I_PointerSystem
{
    #canvasPointers: Record<string, CanvasPointer> = {};
    #cameraPointers: Record<string, CameraPointer> = {};

    #currentCursor: CursorType = 'default';
    #cursorRequests: Map<string, CursorRequest> = new Map();

    get currentCursor(): CursorType {
        return this.#currentCursor;
    }

    getCanvasPointer = (canvasID = DEFAULT_CANVAS_ID): CanvasPointer => {
        return this.#getCanvasPointer(canvasID);
    };

    getCameraPointer = (cameraID = DEFAULT_CAMERA_ID): CameraPointer => {
        return this.#getCameraPointer(cameraID);
    };

    setPointerButtonDown: I_PointerSystem['setPointerButtonDown'] = (
        button: PointerButton,
        down: boolean,
        canvasID = DEFAULT_CANVAS_ID,
    ) => {
        const pointer = this.#getCanvasPointer(canvasID);
        pointer.currentState[button] = {
            ...pointer.currentState[button],
            down,
            downAsNum: down ? 1 : 0,
            downTime: 0,
        };
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

    override earlyUpdate(deltaTime: number) {
        for (const pointer of Object.values(this.#canvasPointers)) {
            pointer.currentState.justMoved =
                pointer.currentState.position.x !==
                    pointer.prevState.position.x ||
                pointer.currentState.position.y !==
                    pointer.prevState.position.y;
            Object.values(PointerButton).forEach((button: PointerButton) => {
                pointer.currentState[button].pressed =
                    pointer.currentState[button].down &&
                    !pointer.prevState[button].down;
                pointer.currentState[button].released =
                    !pointer.currentState[button].down &&
                    pointer.prevState[button].down;
                pointer.currentState[button].clicked = false;

                if (
                    pointer.currentState[button].released &&
                    pointer.currentState.clickStartPosition &&
                    pointer.currentState.clickEndPosition
                ) {
                    const distanceTraveled =
                        pointer.currentState.clickEndPosition.distanceTo(
                            pointer.currentState.clickStartPosition,
                        );
                    if (distanceTraveled <= MAX_DISTANCE_DURING_CLICK) {
                        pointer.currentState[button].clicked = true;
                    }
                } else if (pointer.currentState[button].down) {
                    pointer.currentState[button].downTime += deltaTime;
                }
            });

            const { position, ...restState } = pointer.currentState;
            pointer.prevState = {
                ...pointer.prevState,
                ...restState,
                [PointerButton.LEFT]: {
                    ...pointer.currentState[PointerButton.LEFT],
                },
                [PointerButton.MIDDLE]: {
                    ...pointer.currentState[PointerButton.MIDDLE],
                },
                [PointerButton.RIGHT]: {
                    ...pointer.currentState[PointerButton.RIGHT],
                },
            };
            pointer.prevState.position.set(position);
        }
    }

    capturePointerButtonClick: I_PointerSystem['capturePointerButtonClick'] = (
        button,
        canvasID = DEFAULT_CANVAS_ID,
    ): void => {
        const pointer = this.#getCanvasPointer(canvasID);
        pointer.currentState[button] = {
            ...pointer.currentState[button],
            clicked: false,
            released: false,
            pressed: false,
        };
    };

    #getCanvasPointer(canvasID: string): CanvasPointer {
        if (!(canvasID in this.#canvasPointers)) {
            this.#canvasPointers[canvasID] = {
                currentState: createCanvasPointerState(),
                prevState: createCanvasPointerState(),
            };
        }

        return this.#canvasPointers[canvasID];
    }

    #getCameraPointer(cameraID: string): CameraPointer {
        const camera = this._engine.getCamera(cameraID);
        if (!camera) {
            const canvasID = DEFAULT_CANVAS_ID;
            if (!(cameraID in this.#cameraPointers)) {
                const canvasPointer = this.#getCanvasPointer(canvasID);
                this.#cameraPointers[cameraID] = {
                    canvasPointer,
                    canvasID,
                    accumulatedScrollDelta: 0,
                    scrollSteps: 0,
                    dragStartMousePosition: null,
                    dragStartCameraPosition: null,
                };
            }
            return this.#cameraPointers[cameraID];
        }

        const canvasID = camera.canvasID || DEFAULT_CANVAS_ID;

        if (!(cameraID in this.#cameraPointers)) {
            const canvasPointer = this.#getCanvasPointer(canvasID);
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
}
