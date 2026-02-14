import type { CursorType } from '@repo/engine/pointer';
import { Scene } from '@repo/engine/scene';

import type { EngineScenario } from '../types';

const CURSORS: { cursor: CursorType; label: string; color: string }[] = [
    { cursor: 'pointer', label: 'Pointer', color: '#3498db' },
    { cursor: 'grab', label: 'Grab', color: '#2ecc71' },
    { cursor: 'crosshair', label: 'Crosshair', color: '#e74c3c' },
    { cursor: 'move', label: 'Move', color: '#9b59b6' },
    { cursor: 'not-allowed', label: 'Not Allowed', color: '#e67e22' },
];

const BUTTON_SIZE = 120;
const GAP = 20;
const TOTAL_WIDTH = CURSORS.length * BUTTON_SIZE + (CURSORS.length - 1) * GAP;
const START_X = -TOTAL_WIDTH / 2 + BUTTON_SIZE / 2;
const TEXT_SIZE_MULT = 0.175;

class CursorsScene extends Scene {
    override create(): void {
        const cy = 0;

        for (let i = 0; i < CURSORS.length; i++) {
            const { cursor, label, color } = CURSORS[i];
            const x = START_X + i * (BUTTON_SIZE + GAP);

            this.createEntity({
                name: `cursor_${cursor}`,
                type: 'rectangle',
                position: { x, y: cy },
                scale: BUTTON_SIZE,
                color,
                lineWidth: 2,
                pointerTarget: true,
                cursorOnHover: cursor,
                components: [
                    {
                        type: 'text',
                        text: label,
                        fontSize: TEXT_SIZE_MULT,
                        color: 'white',
                        maxWidth: 1,
                    },
                ],
            });
        }
    }
}

export const cursors: EngineScenario = (harness) => {
    harness.engine.openScene(CursorsScene);
};
