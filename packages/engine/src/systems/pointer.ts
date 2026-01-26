import { DEFAULT_CANVAS_ID } from '../constants';
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
    position: Vector;
    clickStartPosition: Vector | null;
    clickEndPosition: Vector | null;
}

const createCanvasPointerState = (): CanvasPointerState => ({
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
    accumulatedScrollDelta: number;
    scrollSteps: number;
    dragStartMousePosition: Vector | null;
    dragStartCameraPosition: Vector | null;
}

export interface I_PointerSystem {
    getPointerButton: (
        button: PointerButton,
        canvasID?: string,
    ) => Readonly<PointerButtonState>;
    getIsCameraDragging: (threshold?: number, canvasID?: string) => boolean;
    getScrollSteps: (canvasID?: string) => number;
    getCanvasPointer: (canvasID?: string) => CanvasPointer;

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

    #currentCursor: CursorType = 'default';
    #cursorRequests: Map<string, CursorRequest> = new Map();

    get currentCursor(): CursorType {
        return this.#currentCursor;
    }

    getIsCameraDragging: I_PointerSystem['getIsCameraDragging'] = (
        threshold = 0,
        canvasID = DEFAULT_CANVAS_ID,
    ): boolean => {
        const pointer = this.#getCanvasPointer(canvasID);
        if (pointer.dragStartMousePosition === null) return false;

        const screenDelta = pointer.currentState.position.sub(
            pointer.dragStartMousePosition,
        );
        return screenDelta.length() > threshold;
    };

    getPointerButton: I_PointerSystem['getPointerButton'] = (
        button,
        canvasID = DEFAULT_CANVAS_ID,
    ): PointerButtonState => {
        const pointer = this.#getCanvasPointer(canvasID);
        return pointer.currentState[button];
    };

    getScrollSteps: I_PointerSystem['getScrollSteps'] = (
        canvasID = DEFAULT_CANVAS_ID,
    ): number => {
        const pointer = this.#getCanvasPointer(canvasID);
        return pointer.scrollSteps;
    };

    getCanvasPointer: I_PointerSystem['getCanvasPointer'] = (
        canvasID = DEFAULT_CANVAS_ID,
    ): CanvasPointer => {
        return this.#getCanvasPointer(canvasID);
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
    };

    setPointerOnScreen: I_PointerSystem['setPointerOnScreen'] = (
        onScreen,
        position,
        canvasID = DEFAULT_CANVAS_ID,
    ) => {
        const pointer = this.#getCanvasPointer(canvasID);
        pointer.currentState.onScreen = onScreen;
        pointer.currentState.position.set(position);
        pointer.currentState.justMovedOnScreen =
            !pointer.currentState.onScreen && onScreen;
        pointer.currentState.justMovedOffScreen =
            pointer.currentState.onScreen && !onScreen;
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
                accumulatedScrollDelta: 0,
                scrollSteps: 0,
                dragStartMousePosition: null,
                dragStartCameraPosition: null,
            };
        }

        return this.#canvasPointers[canvasID];
    }
}
