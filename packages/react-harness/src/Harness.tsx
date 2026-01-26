import { useEffect, useRef, useState } from 'react';

import {
    DEFAULT_CANVAS_ID,
    Engine,
    type Platform,
    type WebKey,
} from '@repo/engine';

import { type CanvasOptions, CanvasTracker } from './CanvasTracker';
import { getPlatform } from './platform';

interface SizeState {
    width: number;
    height: number;
    dpr: number;
}

interface HarnessProps<TEngine extends Engine = Engine>
    extends React.CanvasHTMLAttributes<HTMLCanvasElement>,
        Partial<CanvasOptions> {
    engine?: TEngine | (new (options?: Partial<TEngine['options']>) => TEngine);
    initialEngineOptions?: Partial<TEngine['options']>;
    engineOptions?: Partial<TEngine['options']>;
    width?: number;
    height?: number;
    onInitialized?: (engine: TEngine) => void;
    canvases?: Record<string, React.RefObject<HTMLCanvasElement>>;
}

export function Harness<TEngine extends Engine = Engine>({
    engine,
    initialEngineOptions,
    engineOptions,
    width: widthProp = -1,
    height: heightProp = -1,
    scrollDirection: scrollDirectionProp,
    scrollSensitivity = 1,
    onInitialized,
    canvases,
    ...rest
}: HarnessProps<TEngine>) {
    const defaultCanvasRef = useRef<HTMLCanvasElement>(null);

    const [size, setSize] = useState<SizeState>({
        width: widthProp ?? window.innerWidth,
        height: heightProp ?? window.innerHeight,
        dpr: window.devicePixelRatio || 1,
    });
    useEffect(() => {
        if (widthProp === -1 || heightProp === -1) {
            const onResize = () => {
                setSize({
                    width: widthProp ?? window.innerWidth,
                    height: heightProp ?? window.innerHeight,
                    dpr: window.devicePixelRatio || 1,
                });
            };
            window.addEventListener('resize', onResize);

            return () => window.removeEventListener('resize', onResize);
        }
    }, [widthProp, heightProp]);

    const engineRef = useRef<TEngine | null>(null);
    const requestedAnimationFrame = useRef<number>(-1);
    const initializedRef = useRef(false);
    const platformRef = useRef<Platform>('unknown');

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
            devicePixelRatio: size.dpr,
            ...initialEngineOptions,
            ...engineOptions,
        };

        const engineCtor = engine || Engine;
        if (
            typeof engineCtor === 'function' &&
            engineCtor.prototype &&
            engineCtor.prototype.constructor === engineCtor
        ) {
            const EngineCtor = engineCtor as new (
                options?: Partial<TEngine['options']>,
            ) => TEngine;
            engineRef.current = new EngineCtor(options);
        } else {
            engineRef.current = engine as TEngine;
            engineRef.current.options = options;
        }

        platformRef.current = getPlatform();
        engineRef.current.setPlatform(platformRef.current);
    }

    useEffect(() => {
        if (!engineRef.current || initializedRef.current) {
            return;
        }

        initializedRef.current = true;
        onInitialized?.(engineRef.current);
    }, [onInitialized]);

    useEffect(() => {
        if (!engineRef.current) {
            return;
        }

        engineRef.current.options = { ...engineOptions };

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

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener(
                'visibilitychange',
                onVisibilityChange,
            );
        };
    }, [size, engineRef, scrollSensitivity, engineOptions]);

    useEffect(() => {
        return () => {
            if (engineRef.current) {
                engineRef.current.destroy();
            }
        };
    }, []);

    if (engineRef.current) {
        engineRef.current.options = { ...engineOptions };
    }

    const scrollDirection =
        scrollDirectionProp ?? (platformRef.current === 'windows' ? 1 : -1);

    if (canvases) {
        return (
            <>
                {Object.entries(canvases).map(([id, canvasRef]) => (
                    <CanvasTracker
                        key={id}
                        canvasID={id}
                        canvasRef={canvasRef}
                        engineRef={engineRef}
                        scrollDirection={scrollDirection}
                        scrollSensitivity={scrollSensitivity}
                    />
                ))}
            </>
        );
    }

    return (
        <>
            <canvas
                {...rest}
                ref={defaultCanvasRef}
                width={size.width * size.dpr}
                height={size.height * size.dpr}
                style={{ width: `${size.width}px`, height: `${size.height}px` }}
            />
            <CanvasTracker
                canvasID={DEFAULT_CANVAS_ID}
                canvasRef={defaultCanvasRef}
                engineRef={engineRef}
                scrollDirection={scrollDirection}
                scrollSensitivity={scrollSensitivity}
            />
        </>
    );
}
