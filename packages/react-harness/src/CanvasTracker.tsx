import { useEffect } from 'react';

import {
    PointerButton,
    type PointerButton as PointerButtonType,
} from '@repo/engine/pointer';
import type { EngineWrapper } from '@repo/engine/wrapper';

export interface CanvasOptions {
    scrollDirection: -1 | 1;
    scrollSensitivity: number;
}

interface CanvasTrackerProps extends CanvasOptions {
    canvasID: string;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    wrapper: React.RefObject<EngineWrapper | null>;
}

export function CanvasTracker({
    canvasID,
    canvasRef,
    wrapper,
    scrollDirection,
    scrollSensitivity,
}: CanvasTrackerProps) {
    const getClientPosition = (clientX: number, clientY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return { x: 0, y: 0 };
        }

        const rect = canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const getPointerPosition = (event: PointerEvent) =>
        getClientPosition(event.clientX, event.clientY);

    useEffect(() => {
        if (!canvasRef.current || !wrapper.current) {
            return;
        }

        const canvas = canvasRef.current;
        const previousStyle = {
            touchAction: canvas.style.touchAction,
            userSelect: canvas.style.userSelect,
            webkitUserSelect: canvas.style.getPropertyValue(
                '-webkit-user-select',
            ),
            webkitTouchCallout: canvas.style.getPropertyValue(
                '-webkit-touch-callout',
            ),
            webkitTapHighlightColor: canvas.style.getPropertyValue(
                '-webkit-tap-highlight-color',
            ),
        };
        canvas.style.touchAction = 'none';
        canvas.style.userSelect = 'none';
        canvas.style.setProperty('-webkit-user-select', 'none');
        canvas.style.setProperty('-webkit-touch-callout', 'none');
        canvas.style.setProperty('-webkit-tap-highlight-color', 'transparent');

        wrapper.current?.setCanvas(canvas, canvasID);
        wrapper.current?.setCanvasSize?.(canvasID, canvas.width, canvas.height);

        const mutationObserver = new MutationObserver(() => {
            wrapper.current?.onCanvasStyleChange(
                canvasID,
                window.getComputedStyle(canvas),
            );
        });
        mutationObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style', 'class'],
        });
        mutationObserver.observe(canvas, {
            attributes: true,
            attributeFilter: ['style', 'class'],
        });

        return () => {
            canvas.style.touchAction = previousStyle.touchAction;
            canvas.style.userSelect = previousStyle.userSelect;
            canvas.style.setProperty(
                '-webkit-user-select',
                previousStyle.webkitUserSelect,
            );
            canvas.style.setProperty(
                '-webkit-touch-callout',
                previousStyle.webkitTouchCallout,
            );
            canvas.style.setProperty(
                '-webkit-tap-highlight-color',
                previousStyle.webkitTapHighlightColor,
            );
            wrapper.current?.setCanvas(null, canvasID);
            mutationObserver.disconnect();
        };
    }, [canvasID, wrapper, canvasRef]);

    useEffect(() => {
        const localCanvas = canvasRef.current;
        if (!localCanvas) {
            return;
        }

        const activeTouches = new Map<number, { x: number; y: number }>();
        let lastPinchDistance: number | null = null;

        const getPinchData = () => {
            const touches = [...activeTouches.values()];
            if (touches.length < 2) {
                return null;
            }

            const [a, b] = touches;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            return {
                distance: Math.hypot(dx, dy),
                midpoint: {
                    x: (a.x + b.x) / 2,
                    y: (a.y + b.y) / 2,
                },
            };
        };

        const onPointerMove = (event: PointerEvent) => {
            if (event.pointerType === 'touch') {
                activeTouches.set(event.pointerId, getPointerPosition(event));
                const pinchData = getPinchData();
                if (pinchData) {
                    wrapper.current?.onPointerMove(
                        canvasID,
                        pinchData.midpoint,
                    );
                    if (lastPinchDistance !== null) {
                        const pinchDelta =
                            (pinchData.distance - lastPinchDistance) *
                            scrollSensitivity;
                        if (pinchDelta !== 0) {
                            wrapper.current?.onWheel(canvasID, pinchDelta);
                        }
                    }
                    lastPinchDistance = pinchData.distance;
                } else {
                    const position = getPointerPosition(event);
                    wrapper.current?.onPointerMove(canvasID, position);
                }
                event.preventDefault();
                return;
            }

            wrapper.current?.onPointerMove(canvasID, getPointerPosition(event));
        };
        localCanvas.addEventListener('pointermove', onPointerMove);

        const onWheel = (event: WheelEvent) => {
            let delta = event.deltaY * scrollDirection;
            if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
                delta = event.deltaY * 40;
            } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
                delta = event.deltaY * 100;
            }
            delta *= scrollSensitivity;

            wrapper.current?.onPointerMove(
                canvasID,
                getClientPosition(event.clientX, event.clientY),
            );
            wrapper.current?.onWheel(canvasID, delta);

            event.preventDefault();
        };
        localCanvas.addEventListener('wheel', onWheel);

        const onPointerDown = (event: PointerEvent) => {
            if (event.pointerType === 'touch') {
                const position = getPointerPosition(event);
                activeTouches.set(event.pointerId, position);

                const pinchData = getPinchData();
                if (pinchData) {
                    lastPinchDistance = pinchData.distance;
                    wrapper.current?.onPointerMove(
                        canvasID,
                        pinchData.midpoint,
                    );
                } else {
                    wrapper.current?.onPointerMove(canvasID, position);
                    wrapper.current?.onPointerDown(
                        canvasID,
                        PointerButton.LEFT,
                    );
                }

                event.preventDefault();
                return;
            }

            wrapper.current?.onPointerMove(canvasID, getPointerPosition(event));
            localCanvas.setPointerCapture(event.pointerId);
            wrapper.current?.onPointerDown(
                canvasID,
                event.button as PointerButtonType,
            );
        };
        localCanvas.addEventListener('pointerdown', onPointerDown);

        const onPointerUp = (event: PointerEvent) => {
            if (event.pointerType === 'touch') {
                const position = getPointerPosition(event);
                wrapper.current?.onPointerMove(canvasID, position);

                const wasPinching = activeTouches.size > 1;
                activeTouches.delete(event.pointerId);
                const stillPinching = activeTouches.size > 1;
                if (!stillPinching) {
                    lastPinchDistance = null;
                }
                if (!wasPinching && activeTouches.size === 0) {
                    wrapper.current?.onPointerUp(canvasID, PointerButton.LEFT);
                }

                event.preventDefault();
                return;
            }

            wrapper.current?.onPointerMove(canvasID, getPointerPosition(event));
            if (localCanvas.hasPointerCapture(event.pointerId)) {
                localCanvas.releasePointerCapture(event.pointerId);
            }

            wrapper.current?.onPointerUp(
                canvasID,
                event.button as PointerButtonType,
            );
        };
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);

        const onPointerEnter = (event: PointerEvent) => {
            if (event.pointerType === 'touch') {
                return;
            }

            wrapper.current?.onPointerEnter(
                canvasID,
                getPointerPosition(event),
            );
        };
        localCanvas.addEventListener('pointerenter', onPointerEnter);

        const onPointerLeave = (event: PointerEvent) => {
            if (event.pointerType === 'touch') {
                return;
            }

            wrapper.current?.onPointerLeave(
                canvasID,
                getPointerPosition(event),
            );
        };
        localCanvas.addEventListener('pointerleave', onPointerLeave);

        const onContextMenu = (event: Event) => event.preventDefault();
        const onSelectStart = (event: Event) => event.preventDefault();
        localCanvas.addEventListener('contextmenu', onContextMenu);
        localCanvas.addEventListener('selectstart', onSelectStart);

        const onDragOver = (event: DragEvent) => {
            event.preventDefault();
            event.dataTransfer!.dropEffect = 'copy';
        };
        localCanvas.addEventListener('dragover', onDragOver);

        return () => {
            localCanvas.removeEventListener('pointermove', onPointerMove);
            localCanvas.removeEventListener('wheel', onWheel);
            localCanvas.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            localCanvas.removeEventListener('pointerenter', onPointerEnter);
            localCanvas.removeEventListener('pointerleave', onPointerLeave);
            localCanvas.removeEventListener('contextmenu', onContextMenu);
            localCanvas.removeEventListener('selectstart', onSelectStart);
            localCanvas.removeEventListener('dragover', onDragOver);
        };
    }, [canvasID, wrapper, scrollDirection, scrollSensitivity]);

    return null;
}
