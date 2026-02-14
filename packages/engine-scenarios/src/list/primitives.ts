import { type Engine, type EngineOptions } from '@repo/engine';
import { Scene } from '@repo/engine/scene';

import type { EngineScenario } from '../types';

/**
 * Primitives scenario: circle, rectangle, line, line with arrow variants, polygon.
 * All arranged so important content is visible in the 800x600 center viewport.
 */
class PrimitivesScene extends Scene {
    override create(_engine: Engine<EngineOptions>): void {
        const cx = 0;
        const cy = 0;
        const spacing = 120;

        this.createEntity({
            name: 'Circle',
            type: 'circle',
            position: { x: cx - spacing, y: cy - spacing * 0.5 },
            scale: 50,
            color: '#3498db',
            lineWidth: 2,
        });

        this.createEntity({
            name: 'Rectangle',
            type: 'rectangle',
            position: { x: cx + spacing, y: cy - spacing * 0.5 },
            scale: { x: 70, y: 50 },
            color: '#2ecc71',
            lineWidth: 2,
        });

        this.createEntity({
            name: 'Line',
            type: 'line',
            position: { x: cx - spacing, y: cy + 20 },
            start: { x: -60, y: 0 },
            end: { x: 60, y: 0 },
            lineColor: '#e74c3c',
            lineWidth: 3,
        });

        this.createEntity({
            name: 'Line arrow end',
            type: 'line',
            position: { x: cx, y: cy + 80 },
            start: { x: -50, y: 0 },
            end: { x: 50, y: 0 },
            endTip: { type: 'arrow', length: 12, angle: 45 },
            lineColor: '#9b59b6',
            lineWidth: 2,
        });

        this.createEntity({
            name: 'Line arrow start',
            type: 'line',
            position: { x: cx, y: cy + 120 },
            start: { x: -50, y: 0 },
            end: { x: 50, y: 0 },
            startTip: { type: 'arrow', length: 10, angle: 35 },
            lineColor: '#e67e22',
            lineWidth: 2,
        });

        this.createEntity({
            name: 'Line both arrows',
            type: 'line',
            position: { x: cx + spacing, y: cy + 80 },
            start: { x: -55, y: 0 },
            end: { x: 55, y: 0 },
            startTip: { type: 'arrow', length: 10, angle: 40 },
            endTip: { type: 'arrow', length: 10, angle: 40 },
            lineColor: '#1abc9c',
            lineWidth: 2,
        });

        this.createEntity({
            name: 'Polygon',
            type: 'polygon',
            position: { x: cx + spacing, y: cy + 140 },
            points: [
                { x: 0, y: -35 },
                { x: 32, y: 28 },
                { x: -40, y: 10 },
                { x: -40, y: -10 },
                { x: 32, y: -28 },
            ],
            color: '#f39c12',
            lineWidth: 2,
        });
    }
}

export const primitives: EngineScenario = (harness) => {
    harness.engine.openScene(PrimitivesScene);
};
