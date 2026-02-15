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

        return () => {
            wrapper.current?.setCanvas(null, canvasID);
        };
    }, [canvasID, wrapper, canvasRef]);

    useEffect(() => {
        const localCanvas = canvasRef.current;
        if (!localCanvas) {
            return;
        }

        const onPointerMove = (event: PointerEvent) => {
            const x = event.offsetX,
                y = event.offsetY;
            wrapper.current?.onPointerMove(canvasID, {
                x,
                y,
            });
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
            wrapper.current?.onPointerDown(
                canvasID,
                event.button as PointerButton,
            );
        };
        localCanvas.addEventListener('pointerdown', onPointerDown);

        const onPointerUp = (event: PointerEvent) => {
            if (localCanvas.hasPointerCapture(event.pointerId)) {
                localCanvas.releasePointerCapture(event.pointerId);
            }

            wrapper.current?.onPointerUp(
                canvasID,
                event.button as PointerButton,
            );
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
