import type {
    BrowserKeyEvent,
    Engine,
    EngineOptions,
    IVector,
} from '@repo/engine';
import type { PointerButton } from '@repo/engine/pointer';

import type { ToEngineMsg } from '../worker';

export abstract class EngineWrapper<
    TEngine extends Engine = Engine,
    TToEngineMsg = ToEngineMsg,
> {
    getEngine(): TEngine | null {
        return null;
    }

    abstract destroy(): void;

    abstract setOptions(options: Partial<EngineOptions>): void;

    abstract setCanvas(
        canvas: HTMLCanvasElement | null,
        canvasID: string,
    ): void;
    abstract onCanvasStyleChange(
        canvasID: string,
        styleProperties: CSSStyleDeclaration,
    ): void;

    abstract onKeyDown(event: BrowserKeyEvent): void;
    abstract onKeyUp(event: BrowserKeyEvent): void;
    abstract releaseAllKeys(): void;

    abstract onPointerMove(canvasID: string, position: IVector<number>): void;
    abstract onWheel(canvasID: string, delta: number): void;
    abstract onPointerDown(canvasID: string, button: PointerButton): void;
    abstract onPointerUp(canvasID: string, button: PointerButton): void;
    abstract onPointerEnter(canvasID: string, position: IVector<number>): void;
    abstract onPointerLeave(canvasID: string, position: IVector<number>): void;

    // Worker wrappers only
    abstract setCanvasSize(
        canvasID: string,
        width: number,
        height: number,
    ): void;
    abstract sendMessage(
        message: TToEngineMsg,
        transfer?: Transferable[],
    ): void;
}
