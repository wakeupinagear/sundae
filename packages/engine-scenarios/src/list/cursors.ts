import type { EntityJSON } from '@repo/engine/entities';
import type { CursorType } from '@repo/engine/pointer';

import type { EngineScenario } from '../types';

const CURSORS: { cursor: CursorType; label: string; color: string }[] = [
    { cursor: 'pointer', label: 'Pointer', color: '#3498db' },
    { cursor: 'grab', label: 'Grab', color: '#2ecc71' },
    { cursor: 'crosshair', label: 'Crosshair', color: '#e74c3c' },
    { cursor: 'move', label: 'Move', color: '#9b59b6' },
    { cursor: 'not-allowed', label: 'Not Allowed', color: '#e67e22' },
];

const BUTTON_SIZE = 120;
const TEXT_SIZE_MULT = 0.175;

export const cursors: EngineScenario = (harness) => {
    harness.engine.openScene({
        name: 'cursors',
        entities: [
            {
                type: 'entity',
                layoutMode: 'row',
                gap: 32,
                children: CURSORS.map(
                    ({ cursor, label, color }) =>
                        ({
                            type: 'rectangle',
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
                        }) as EntityJSON,
                ),
            },
        ],
    });
};
