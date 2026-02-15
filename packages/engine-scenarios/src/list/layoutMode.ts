import type { EntityJSON } from '@repo/engine/entities';

import type { EngineScenario } from '../types';

const BOX_COLORS = [
    '#2563eb',
    '#16a34a',
    '#d97706',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
];

const WORD_TEXT_COLOR = '#f8fafc';
const WORD_PADDING = 12;
const WORD_GAP = 18;
const SHAPE_SIZE = 64;

const COLUMN_WORDS = 'This is a Column';
const ROW_WORDS = 'This is a Row';
const CAMERA_WORDS = 'This is a Row pinned to the camera';

function mapWordsToEntities(sentence: string): EntityJSON[] {
    return sentence.split(' ').map((word, index) => ({
        type: 'text',
        text: word,
        color: WORD_TEXT_COLOR,
        bold: word === 'Column' || word === 'Row',
        fontSize: 24,
        padding: WORD_PADDING,
        background: {
            type: 'rectangle',
            color: BOX_COLORS[index % BOX_COLORS.length],
            opacity: 1,
        },
        textAlign: 'bottom-right',
    }));
}

export const layoutMode: EngineScenario = (harness) => {
    harness.engine.openScene({
        name: 'layout-mode',
        entities: [
            {
                type: 'entity',
                position: { x: -150, y: 0 },
                layoutMode: 'column',
                gap: WORD_GAP,
                background: '#333333',
                children: mapWordsToEntities(COLUMN_WORDS),
            },
            {
                type: 'entity',
                position: { x: 150, y: 0 },
                layoutMode: 'row',
                gap: WORD_GAP,
                background: '#333333',
                children: mapWordsToEntities(ROW_WORDS),
            },
            {
                position: { x: 0, y: 30 },
                type: 'entity',
                layoutMode: 'row',
                gap: WORD_GAP,
                background: '#333333',
                children: mapWordsToEntities(CAMERA_WORDS),
                positionRelativeToCamera: { x: 'center', y: 'start' },
            },
            {
                type: 'entity',
                position: { x: 0, y: 200 },
                layoutMode: 'row',
                gap: WORD_GAP,
                background: '#333333',
                children: [
                    {
                        type: 'circle',
                        color: 'red',
                        scale: SHAPE_SIZE,
                    },
                    {
                        type: 'rectangle',
                        color: 'blue',
                        lineColor: 'purple',
                        lineWidth: 10,
                        scale: SHAPE_SIZE,
                    },
                    {
                        type: 'line',
                        lineColor: 'green',
                        start: { x: -SHAPE_SIZE, y: SHAPE_SIZE / 2 },
                        startTip: { type: 'arrow', length: 10, angle: 45 },
                        end: { x: SHAPE_SIZE, y: -SHAPE_SIZE / 2 },
                        endTip: { type: 'arrow', length: 10, angle: 45 },
                        lineWidth: 4,
                    },
                    {
                        type: 'polygon',
                        lineColor: 'purple',
                        lineWidth: 4,
                        points: [
                            { x: -SHAPE_SIZE / 2, y: SHAPE_SIZE / 2 },
                            { x: SHAPE_SIZE / 2, y: SHAPE_SIZE / 2 },
                            { x: 0, y: -SHAPE_SIZE / 2 },
                        ],
                    },
                ],
            },
        ],
    });
};
