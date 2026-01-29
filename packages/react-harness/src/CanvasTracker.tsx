import { useEffect } from 'react';

import { type Engine } from '@repo/engine';
import { type PointerButton } from '@repo/engine/pointer';

export interface CanvasOptions {
    scrollDirection: -1 | 1;
    scrollSensitivity: number;
}

interface CanvasTrackerProps extends CanvasOptions {
    canvasID: string;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    engineRef: React.RefObject<Engine | null>;
}

export function CanvasTracker({
    canvasID,
    canvasRef,
    engineRef,
    scrollDirection,
    scrollSensitivity,
}: CanvasTrackerProps) {
    useEffect(() => {
        if (!canvasRef.current || !engineRef.current) {
            return;
        }

        engineRef.current.setCanvas(canvasRef.current, canvasID);

        return () => {
            engineRef.current?.setCanvas(null, canvasID);
        };
    }, [canvasID, engineRef, canvasRef]);

    useEffect(() => {
        const localCanvas = canvasRef.current;
        if (!localCanvas || !engineRef.current) {
            return;
        }

        const onPointerMove = (event: PointerEvent) => {
            const x = event.clientX - localCanvas.offsetLeft,
                y = event.clientY - localCanvas.offsetTop;
            engineRef.current?.onPointerMove('pointermove', canvasID, {
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

            engineRef.current?.onPointerMove('pointermove', canvasID, {
                x: event.offsetX,
                y: event.offsetY,
            });
            engineRef.current?.onWheel('wheel', canvasID, { delta });

            event.preventDefault();
        };
        localCanvas.addEventListener('wheel', onWheel);

        const onPointerDown = (event: PointerEvent) => {
            localCanvas.setPointerCapture(event.pointerId);
            engineRef.current?.onPointerDown('pointerdown', canvasID, {
                button: event.button as PointerButton,
            });
        };
        localCanvas.addEventListener('pointerdown', onPointerDown);

        const onPointerUp = (event: PointerEvent) => {
            if (localCanvas.hasPointerCapture(event.pointerId)) {
                localCanvas.releasePointerCapture(event.pointerId);
            }

            engineRef.current?.onPointerUp('pointerup', canvasID, {
                button: event.button as PointerButton,
            });
        };
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);

        const onPointerEnter = (event: PointerEvent) =>
            engineRef.current?.onPointerEnter('pointerenter', canvasID, {
                target: event.target,
                x: event.offsetX,
                y: event.offsetY,
            });
        localCanvas.addEventListener('pointerenter', onPointerEnter);

        const onPointerLeave = (event: PointerEvent) =>
            engineRef.current?.onPointerLeave('pointerleave', canvasID, {
                target: event.target,
                x: event.offsetX,
                y: event.offsetY,
            });
        localCanvas.addEventListener('pointerleave', onPointerLeave);

        const onPointerOver = (event: PointerEvent) =>
            engineRef.current?.onPointerOver('pointerover', canvasID, {
                from: event.relatedTarget,
                to: event.target,
            });
        localCanvas.addEventListener('pointerover', onPointerOver);

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
            localCanvas.removeEventListener('pointerover', onPointerOver);
            localCanvas.removeEventListener('dragover', onDragOver);
        };
    }, [canvasID, engineRef, scrollDirection, scrollSensitivity]);

    return null;
}
