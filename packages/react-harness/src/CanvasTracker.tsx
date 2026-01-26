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

        const onMouseMove = (event: MouseEvent) => {
            const x = event.clientX - localCanvas.offsetLeft,
                y = event.clientY - localCanvas.offsetTop;
            engineRef.current?.onMouseMove('mousemove', canvasID, {
                x,
                y,
            });
        };
        window.addEventListener('mousemove', onMouseMove);

        const onMouseWheel = (event: WheelEvent) => {
            let delta = event.deltaY * scrollDirection;
            if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
                delta = event.deltaY * 40;
            } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
                delta = event.deltaY * 100;
            }
            delta *= scrollSensitivity;
            engineRef.current?.onMouseMove('mousemove', canvasID, {
                x: event.offsetX,
                y: event.offsetY,
            });
            engineRef.current?.onMouseWheel('mousewheel', canvasID, { delta });
            event.preventDefault();
        };
        localCanvas.addEventListener('wheel', onMouseWheel);

        const onMouseDown = (event: MouseEvent) =>
            engineRef.current?.onMouseDown('mousedown', canvasID, {
                button: event.button as PointerButton,
            });
        localCanvas.addEventListener('mousedown', onMouseDown);

        const onMouseUp = (event: MouseEvent) =>
            engineRef.current?.onMouseUp('mouseup', canvasID, {
                button: event.button as PointerButton,
            });
        window.addEventListener('mouseup', onMouseUp);

        const onMouseEnter = (event: MouseEvent) =>
            engineRef.current?.onMouseEnter('mouseenter', canvasID, {
                target: event.target,
                x: event.offsetX,
                y: event.offsetY,
            });
        localCanvas.addEventListener('mouseenter', onMouseEnter);

        const onMouseLeave = (event: MouseEvent) =>
            engineRef.current?.onMouseLeave('mouseleave', canvasID, {
                target: event.target,
                x: event.offsetX,
                y: event.offsetY,
            });
        localCanvas.addEventListener('mouseleave', onMouseLeave);

        const onMouseOver = (event: MouseEvent) =>
            engineRef.current?.onMouseOver('mouseover', canvasID, {
                from: event.relatedTarget,
                to: event.target,
            });
        localCanvas.addEventListener('mouseover', onMouseOver);

        localCanvas.addEventListener('contextmenu', (event) =>
            event.preventDefault(),
        );

        const onDragOver = (event: DragEvent) => {
            event.preventDefault();
            event.dataTransfer!.dropEffect = 'copy';
        };
        localCanvas.addEventListener('dragover', onDragOver);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            localCanvas.removeEventListener('wheel', onMouseWheel);
            window.removeEventListener('mousedown', onMouseDown);
            localCanvas.removeEventListener('mouseup', onMouseUp);
            localCanvas.removeEventListener('mouseenter', onMouseEnter);
            localCanvas.removeEventListener('mouseleave', onMouseLeave);
            localCanvas.removeEventListener('mouseover', onMouseOver);
            localCanvas.removeEventListener('dragover', onDragOver);
        };
    }, [canvasID, engineRef, scrollDirection, scrollSensitivity]);

    return null;
}
