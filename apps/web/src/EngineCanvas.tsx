import { useEffect, useRef, useState } from 'react';
import { type Engine, type WebKey } from '@repo/engine';
import { type PointerButton } from '@repo/engine/pointer';

interface EngineCanvasProps<TEngine extends Engine = Engine>
    extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
    engine?: TEngine | (new (options?: Partial<TEngine['options']>) => TEngine);
    engineOptions?: Partial<TEngine['options']>;
    width: number;
    height: number;
    scrollDirection?: -1 | 1;
    scrollSensitivity?: number;
    onInitialized?: (engine: TEngine) => void;
}

export function EngineCanvas<TEngine extends Engine = Engine>({
    engine,
    engineOptions,
    width,
    height,
    scrollDirection = 1,
    scrollSensitivity = 1,
    onInitialized,
    ...rest
}: EngineCanvasProps<TEngine>) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dpr] = useState(() => window.devicePixelRatio || 1);

    const engineRef = useRef<TEngine | null>(null);
    const requestedAnimationFrame = useRef<number>(-1);
    const initializedRef = useRef(false);

    if (!engineRef.current) {
        const options: Partial<TEngine['options']> = {
            onReadyForNextFrame: (startNextFrame: () => void) => {
                requestedAnimationFrame.current =
                    window.requestAnimationFrame(startNextFrame);
            },
            onDestroy: () => {
                if (requestedAnimationFrame.current !== -1) {
                    window.cancelAnimationFrame(
                        requestedAnimationFrame.current,
                    );
                    requestedAnimationFrame.current = -1;
                }
            },
            devicePixelRatio: dpr,
            ...engineOptions,
        };

        if (engine) {
            if (
                typeof engine === 'function' &&
                engine.prototype &&
                engine.prototype.constructor === engine
            ) {
                const EngineCtor = engine as new (options?: Partial<TEngine['options']>) => TEngine;
                engineRef.current = new EngineCtor(options);
            } else {
                engineRef.current = engine as TEngine;
                engineRef.current.options = options;
            }
        }
    }

    useEffect(() => {
        if (
            !canvasRef.current ||
            !engineRef.current ||
            initializedRef.current
        ) {
            return;
        }

        initializedRef.current = true;
        onInitialized?.(engineRef.current);
    }, [onInitialized]);

    useEffect(() => {
        if (!canvasRef.current || !engineRef.current) {
            return;
        }

        engineRef.current.options = { ...engineOptions };

        const localCanvas = canvasRef.current;
        engineRef.current.canvas = localCanvas;

        const onMouseMove = (event: MouseEvent) =>
            engineRef.current?.onMouseMove('mousemove', {
                x: event.offsetX,
                y: event.offsetY,
            });
        localCanvas.addEventListener('mousemove', onMouseMove);
        const onMouseWheel = (event: WheelEvent) => {
            let delta = event.deltaY * scrollDirection;
            if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
                delta = event.deltaY * 40;
            } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
                delta = event.deltaY * 100;
            }
            delta *= scrollSensitivity;
            engineRef.current?.onMouseWheel('mousewheel', { delta });
            event.preventDefault();
        };
        localCanvas.addEventListener('wheel', onMouseWheel);
        const onMouseDown = (event: MouseEvent) =>
            engineRef.current?.onMouseDown('mousedown', {
                button: event.button as PointerButton,
            });
        localCanvas.addEventListener('mousedown', onMouseDown);
        const onMouseUp = (event: MouseEvent) =>
            engineRef.current?.onMouseUp('mouseup', {
                button: event.button as PointerButton,
            });
        localCanvas.addEventListener('mouseup', onMouseUp);
        const onMouseEnter = (event: MouseEvent) =>
            engineRef.current?.onMouseEnter('mouseenter', {
                target: event.target,
                x: event.offsetX,
                y: event.offsetY,
            });
        localCanvas.addEventListener('mouseenter', onMouseEnter);
        const onMouseLeave = (event: MouseEvent) =>
            engineRef.current?.onMouseLeave('mouseleave', {
                target: event.target,
                x: event.offsetX,
                y: event.offsetY,
            });
        localCanvas.addEventListener('mouseleave', onMouseLeave);
        const onMouseOver = (event: MouseEvent) =>
            engineRef.current?.onMouseOver('mouseover', {
                from: event.relatedTarget,
                to: event.target,
            });
        localCanvas.addEventListener('mouseover', onMouseOver);

        const isInputFocused = (): boolean => {
            const activeElement = document.activeElement;
            if (!activeElement) return false;

            const tagName = activeElement.tagName.toLowerCase();
            const isInput = tagName === 'input' || tagName === 'textarea';
            const isContentEditable =
                activeElement.hasAttribute('contenteditable');

            return isInput || isContentEditable;
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (isInputFocused()) {
                return;
            }

            if (
                engineRef.current?.onKeyDown('keydown', {
                    key: event.key as WebKey,
                    ctrl: event.ctrlKey,
                    meta: event.metaKey,
                    shift: event.shiftKey,
                    alt: event.altKey,
                })
            ) {
                event.preventDefault();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        const onKeyUp = (event: KeyboardEvent) => {
            if (isInputFocused()) {
                return;
            }

            if (
                engineRef.current?.onKeyUp('keyup', {
                    key: event.key as WebKey,
                    ctrl: event.ctrlKey,
                    meta: event.metaKey,
                    shift: event.shiftKey,
                    alt: event.altKey,
                })
            ) {
                event.preventDefault();
            }
        };
        window.addEventListener('keyup', onKeyUp);

        const onBlur = () => {
            engineRef.current?.resetAllKeyboardKeys?.();
        };
        window.addEventListener('blur', onBlur);

        const onVisibilityChange = () => {
            if (document.visibilityState !== 'visible') {
                engineRef.current?.resetAllKeyboardKeys?.();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        localCanvas.addEventListener('contextmenu', (event) =>
            event.preventDefault(),
        );

        const onDragOver = (event: DragEvent) => {
            event.preventDefault();
            event.dataTransfer!.dropEffect = 'copy';
        };
        localCanvas.addEventListener('dragover', onDragOver);

        const onDrop = (event: DragEvent) => {
            event.preventDefault();
            const entityType = event.dataTransfer?.getData('entityType');
            if (!entityType || !engineRef.current) {
                return;
            }
        };
        localCanvas.addEventListener('drop', onDrop);

        return () => {
            localCanvas.removeEventListener('mousemove', onMouseMove);
            localCanvas.removeEventListener('wheel', onMouseWheel);
            localCanvas.removeEventListener('mousedown', onMouseDown);
            localCanvas.removeEventListener('mouseup', onMouseUp);
            localCanvas.removeEventListener('mouseenter', onMouseEnter);
            localCanvas.removeEventListener('mouseleave', onMouseLeave);
            localCanvas.removeEventListener('mouseover', onMouseOver);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener(
                'visibilitychange',
                onVisibilityChange,
            );
            localCanvas.removeEventListener('dragover', onDragOver);
            localCanvas.removeEventListener('drop', onDrop);
        };
    }, [dpr, engineRef, scrollDirection, scrollSensitivity, engineOptions]);

    if (engineRef.current) {
        engineRef.current.options = { ...engineOptions };
    }

    return (
        <canvas
            {...rest}
            ref={canvasRef}
            width={width * dpr}
            height={height * dpr}
            style={{ width: `${width}px`, height: `${height}px` }}
        />
    );
}
