import type { EngineScenario } from '../types';

export const CSS_COLOR_VARIABLES_STYLES_USED = [
    '--background',
    '--foreground',
    '--card',
    '--border',
    '--primary',
];
const BACKGROUND_COLOR = `var(${CSS_COLOR_VARIABLES_STYLES_USED[0]})`;
const TEXT_COLOR = `var(${CSS_COLOR_VARIABLES_STYLES_USED[1]})`;
const CARD_COLOR = `var(${CSS_COLOR_VARIABLES_STYLES_USED[2]})`;
const BORDER_COLOR = `var(${CSS_COLOR_VARIABLES_STYLES_USED[3]})`;
const PRIMARY_COLOR = `var(${CSS_COLOR_VARIABLES_STYLES_USED[4]})`;

export const cssColorVariables: EngineScenario = (harness) => {
    harness.engine.options = {
        cameraOptions: {
            clearColor: BACKGROUND_COLOR,
        },
    };

    harness.engine.openScene({
        name: 'cssColors',
        entities: [
            {
                type: 'entity',
                layoutMode: 'row',
                positionRelativeToCamera: 'start',
                gap: 24,
                position: { x: 316, y: 32 },
                children: [
                    {
                        type: 'line',
                        start: { x: -50, y: 0 },
                        end: { x: 50, y: 0 },
                        lineColor: PRIMARY_COLOR,
                        lineWidth: 4,
                        startTip: { type: 'arrow', length: 10, angle: 45 },
                    },
                    {
                        type: 'text',
                        text: 'Try toggling the Light/Dark Mode',
                        color: TEXT_COLOR,
                        fontSize: 24,
                    },
                ],
            },
            {
                type: 'entity',
                layoutMode: 'row',
                gap: 24,
                children: [
                    {
                        type: 'rectangle',
                        scale: 120,
                        color: CARD_COLOR,
                        components: [
                            {
                                type: 'text',
                                text: `Card\n${CARD_COLOR}`,
                                color: TEXT_COLOR,
                                fontSize: 0.1,
                                lineGap: 0.1,
                            },
                        ],
                    },
                    {
                        type: 'rectangle',
                        scale: 120,
                        lineColor: BORDER_COLOR,
                        lineWidth: 4,
                        components: [
                            {
                                type: 'text',
                                text: `Border\n${BORDER_COLOR}`,
                                color: TEXT_COLOR,
                                fontSize: 0.1,
                                lineGap: 0.1,
                            },
                        ],
                    },
                    {
                        type: 'rectangle',
                        scale: 120,
                        color: PRIMARY_COLOR,
                        components: [
                            {
                                type: 'text',
                                text: `Primary\n${PRIMARY_COLOR}`,
                                color: BACKGROUND_COLOR,
                                fontSize: 0.1,
                                lineGap: 0.1,
                            },
                        ],
                    },
                ],
            },
        ],
    });
};
