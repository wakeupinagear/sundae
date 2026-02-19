import { useEffect } from 'react';

import { type PointerButton } from '@repo/engine/pointer';
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
    useEffect(() => {
        if (!canvasRef.current || !wrapper.current) {
            return;
        }

        const canvas = canvasRef.current;
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
            wrapper.current?.setCanvas(null, canvasID);
            mutationObserver.disconnect();
        };
    }, [canvasID, wrapper, canvasRef]);

    useEffect(() => {
        const localCanvas = canvasRef.current;
        if (!localCanvas) {
            return;
        }

        // Track active pointers for pinch-to-zoom detection
        const activePointers = new Map<number, { x: number; y: number }>();
        let lastPinchDistance: number | null = null;

        const onPointerMove = (event: PointerEvent) => {
            // Update stored position for this pointer
            if (activePointers.has(event.pointerId)) {
                activePointers.set(event.pointerId, {
                    x: event.clientX,
                    y: event.clientY,
                });
            }

            if (activePointers.size >= 2) {
                // Two-finger pinch: compute distance change and emit as scroll
                const positions = Array.from(activePointers.values());
                const [p1, p2] = positions;
                const currentDistance = Math.hypot(
                    p2.x - p1.x,
                    p2.y - p1.y,
                );
                if (lastPinchDistance !== null) {
                    const delta =
                        (currentDistance - lastPinchDistance) *
                        scrollSensitivity;
                    // Move pointer to pinch midpoint (in CSS pixels)
                    const rect = localCanvas.getBoundingClientRect();
                    const midX = (p1.x + p2.x) / 2 - rect.left;
                    const midY = (p1.y + p2.y) / 2 - rect.top;
                    wrapper.current?.onPointerMove(canvasID, {
                        x: midX,
                        y: midY,
                    });
                    if (delta !== 0) {
                        wrapper.current?.onWheel(canvasID, delta);
                    }
                }
                lastPinchDistance = currentDistance;
            } else {
                lastPinchDistance = null;
                wrapper.current?.onPointerMove(canvasID, {
                    x: event.offsetX,
                    y: event.offsetY,
                });
            }
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

            wrapper.current?.onPointerMove(canvasID, {
                x: event.offsetX,
                y: event.offsetY,
            });
            wrapper.current?.onWheel(canvasID, delta);

            event.preventDefault();
        };
        localCanvas.addEventListener('wheel', onWheel);

        const onPointerDown = (event: PointerEvent) => {
            localCanvas.setPointerCapture(event.pointerId);
            activePointers.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
            });
            // Only fire button events for the first pointer; additional fingers
            // are treated as a pinch gesture, not button presses.
            if (activePointers.size === 1) {
                wrapper.current?.onPointerDown(
                    canvasID,
                    event.button as PointerButton,
                );
            }
        };
        localCanvas.addEventListener('pointerdown', onPointerDown);

        const onPointerUp = (event: PointerEvent) => {
            const wasMultiTouch = activePointers.size > 1;
            activePointers.delete(event.pointerId);
            if (localCanvas.hasPointerCapture(event.pointerId)) {
                localCanvas.releasePointerCapture(event.pointerId);
            }
            if (activePointers.size === 0) {
                lastPinchDistance = null;
            }
            // Only fire button up when not in a pinch gesture
            if (!wasMultiTouch) {
                wrapper.current?.onPointerUp(
                    canvasID,
                    event.button as PointerButton,
                );
            }
        };
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);

        const onPointerEnter = (event: PointerEvent) =>
            wrapper.current?.onPointerEnter(canvasID, {
                x: event.offsetX,
                y: event.offsetY,
            });
        localCanvas.addEventListener('pointerenter', onPointerEnter);

        const onPointerLeave = (event: PointerEvent) =>
            wrapper.current?.onPointerLeave(canvasID, {
                x: event.offsetX,
                y: event.offsetY,
            });
        localCanvas.addEventListener('pointerleave', onPointerLeave);

        localCanvas.addEventListener('contextmenu', (event) =>
            event.preventDefault(),
        );

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
            localCanvas.removeEventListener('dragover', onDragOver);
        };
    }, [canvasID, wrapper, scrollDirection, scrollSensitivity]);

    return null;
}
