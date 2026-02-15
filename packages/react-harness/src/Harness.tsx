import { useEffect, useRef, useState } from 'react';

import {
    DEFAULT_CANVAS_ID,
    type Engine,
    type EngineConstructor,
    type Platform,
    type WebKey,
    createEngine,
} from '@repo/engine';
import type { ToEngineMsg, WorkerConstructor } from '@repo/engine/worker';
import {
    type EngineWrapper,
    MainThreadWrapper,
    WorkerWrapper,
} from '@repo/engine/wrapper';

import { type CanvasOptions, CanvasTracker } from './CanvasTracker';
import { getPlatform } from './platform';

interface SizeState {
    width: number;
    height: number;
    dpr: number;
}

interface HarnessProps<
    TEngine extends Engine = Engine,
    TToEngineMsg = ToEngineMsg,
> extends React.CanvasHTMLAttributes<HTMLCanvasElement>,
        Partial<CanvasOptions> {
    engine?: EngineConstructor<TEngine>;
    initialEngineOptions?: Partial<TEngine['options']>;
    engineOptions?: Partial<TEngine['options']>;
    onEngineReady?: (engine: TEngine) => void;
    width?: number;
    height?: number;
    canvases?: Record<string, React.RefObject<HTMLCanvasElement>>;
    containerRef?: React.RefObject<HTMLDivElement | null>;
    engineWrapperRef?: React.RefObject<EngineWrapper<
        TEngine,
        TToEngineMsg
    > | null>;
    runInWorker?: boolean;
    workerConstructor?: WorkerConstructor;
}

export function Harness<
    TEngine extends Engine = Engine,
    TToEngineMsg extends ToEngineMsg = ToEngineMsg,
>({
    engine,
    initialEngineOptions,
    engineOptions,
    scrollDirection: scrollDirectionProp,
    scrollSensitivity = 1,
    onEngineReady,
    width: widthProp,
    height: heightProp,
    canvases,
    containerRef,
    engineWrapperRef: externalEngineWrapperRef,
    runInWorker,
    workerConstructor,
    ...rest
}: HarnessProps<TEngine, TToEngineMsg>) {
    const defaultCanvasRef = useRef<HTMLCanvasElement>(null);

    const [size, setSize] = useState<SizeState>({
        width:
            widthProp ??
            containerRef?.current?.clientWidth ??
            window.innerWidth,
        height:
            heightProp ??
            containerRef?.current?.clientHeight ??
            window.innerHeight,
        dpr: window.devicePixelRatio || 1,
    });
    useEffect(() => {
        if (!canvases && (!widthProp || !heightProp)) {
            const onResize = () => {
                setSize({
                    width:
                        widthProp ??
                        containerRef?.current?.clientWidth ??
                        window.innerWidth,
                    height:
                        heightProp ??
                        containerRef?.current?.clientHeight ??
                        window.innerHeight,
                    dpr: window.devicePixelRatio || 1,
                });
            };
            window.addEventListener('resize', onResize);
            onResize();

            return () => window.removeEventListener('resize', onResize);
        }
    }, [canvases, widthProp, heightProp, containerRef]);

    const wrapperRef = useRef<EngineWrapper<TEngine, TToEngineMsg> | null>(
        null,
    );
    const requestedAnimationFrame = useRef<number>(-1);
    const platformRef = useRef<Platform>('unknown');

    if (!wrapperRef.current) {
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

        platformRef.current = getPlatform();

        if (runInWorker && workerConstructor) {
            wrapperRef.current = new WorkerWrapper<TEngine, TToEngineMsg>(
                workerConstructor,
            );
        } else {
            const engineInstance = createEngine(engine, {
                engineOptions: options,
                platform: platformRef.current,
            });
            wrapperRef.current = new MainThreadWrapper<TEngine, TToEngineMsg>(
                engineInstance,
            );
        }

        wrapperRef.current.setOptions(initialEngineOptions ?? {});
        if (externalEngineWrapperRef) {
            externalEngineWrapperRef.current = wrapperRef.current;
        }
    }

    useEffect(() => {
        const engine = wrapperRef.current?.getEngine();
        if (engine) {
            onEngineReady?.(engine);
        }
    }, [onEngineReady]);

    useEffect(() => {
        if (!wrapperRef.current) {
            return;
        }

        wrapperRef.current.setOptions({
            devicePixelRatio: size.dpr,
            ...engineOptions,
        });

        if (!canvases) {
            wrapperRef.current.setCanvasSize?.(
                DEFAULT_CANVAS_ID,
                size.width * size.dpr,
                size.height * size.dpr,
            );
        }

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
                wrapperRef.current?.onKeyDown({
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
                wrapperRef.current?.onKeyUp({
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

        const onVisibilityChange = () => {
            if (document.visibilityState !== 'visible') {
                wrapperRef.current?.releaseAllKeys();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            document.removeEventListener(
                'visibilitychange',
                onVisibilityChange,
            );
        };
    }, [size, wrapperRef, scrollSensitivity, engineOptions]);

    useEffect(() => {
        return () => {
            wrapperRef.current?.destroy();
        };
    }, []);

    useEffect(() => {
        wrapperRef.current?.setOptions({ ...engineOptions });
    }, [engineOptions]);

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
                        wrapper={wrapperRef}
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
                style={{
                    width: `${size.width}px`,
                    height: `${size.height}px`,
                    touchAction: 'none',
                }}
            />
            <CanvasTracker
                canvasID={DEFAULT_CANVAS_ID}
                canvasRef={defaultCanvasRef}
                wrapper={wrapperRef}
                scrollDirection={scrollDirection}
                scrollSensitivity={scrollSensitivity}
            />
        </>
    );
}
