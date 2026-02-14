import type { E_TextOptions } from '@repo/engine/entities';

import { SCENARIO_ASSETS } from '../assets';
import type { EngineScenario } from '../types';

const Y_OFFSET = 16;
const IMAGE_SCALE = 250;
const IMAGE_OFFSET = 150;
const TEXT_FONT_SIZE = 24 / IMAGE_SCALE;
const TEXT_OFFSET = { x: -0.5, y: -0.57 };

const TEXT_OPTIONS: E_TextOptions = {
    fontSize: TEXT_FONT_SIZE,
    bold: true,
    color: 'white',
    position: TEXT_OFFSET,
    textAlign: 'right',
};

export const images: EngineScenario = (harness) => {
    harness.engine.options = {
        cameraOptions: {
            maxZoom: 3,
        },
    };
    harness.engine.openScene({
        name: 'Images',
        entities: [
            {
                type: 'image',
                name: 'sundae',
                image: SCENARIO_ASSETS.SUNDAE_IMAGES.PNG,
                scale: IMAGE_SCALE,
                position: { x: -IMAGE_OFFSET, y: -IMAGE_OFFSET + Y_OFFSET },
                children: [
                    {
                        type: 'text',
                        text: 'PNG',
                        ...TEXT_OPTIONS,
                    },
                ],
            },
            {
                type: 'image',
                name: 'sundae',
                image: SCENARIO_ASSETS.SUNDAE_IMAGES.JPG,
                scale: IMAGE_SCALE,
                position: { x: IMAGE_OFFSET, y: -IMAGE_OFFSET + Y_OFFSET },
                children: [
                    {
                        type: 'text',
                        text: 'JPG',
                        ...TEXT_OPTIONS,
                    },
                ],
            },
            {
                type: 'image',
                name: 'sundae',
                image: SCENARIO_ASSETS.SUNDAE_IMAGES.SVG,
                scale: IMAGE_SCALE,
                position: { x: -IMAGE_OFFSET, y: IMAGE_OFFSET + Y_OFFSET },
                children: [
                    {
                        type: 'text',
                        text: 'SVG',
                        ...TEXT_OPTIONS,
                    },
                ],
            },
            {
                type: 'image',
                name: 'sundae',
                image: SCENARIO_ASSETS.SUNDAE_IMAGES.WEBP,
                scale: IMAGE_SCALE,
                position: { x: IMAGE_OFFSET, y: IMAGE_OFFSET + Y_OFFSET },
                children: [
                    {
                        type: 'text',
                        text: 'WEBP',
                        ...TEXT_OPTIONS,
                    },
                ],
            },
        ],
    });
};
