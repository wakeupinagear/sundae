import type { EngineScenario } from '../types';

const SIZE = 240;

export const zIndex: EngineScenario = (harness) => {
    harness.engine.openScene({
        name: 'Z-Index',
        entities: [
            {
                name: 'Top (z 2)',
                type: 'circle',
                position: { x: -20, y: -50 },
                scale: SIZE * 0.5,
                zIndex: 2,
                color: '#e74c3c',
            },
            {
                name: 'Front (z 1)',
                type: 'rectangle',
                position: { x: -80, y: 80 },
                scale: SIZE * 0.7,
                zIndex: 1,
                color: 'var(--background)', //'#f9a826',
            },
            {
                name: 'Middle (z 0)',
                type: 'circle',
                position: { x: 50, y: -30 },
                scale: SIZE * 0.85,
                zIndex: 0,
                color: '#7ed56f',
            },
            {
                name: 'Back (z -1)',
                type: 'rectangle',
                scale: SIZE,
                zIndex: -1,
                color: '#4a90d9',
            },
        ],
    });
};
