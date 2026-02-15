import type { AssetType } from '@repo/engine/asset';

const VITE_BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env
    ?.BASE_URL;
const NORMALIZED_BASE_URL = (VITE_BASE_URL || '/').replace(/\/+$/, '');

const ASSETS_BASE_URL = `${NORMALIZED_BASE_URL}/scenario-assets`;

export type ScenarioAssets = Record<
    string,
    {
        type: AssetType;
        src: string;
    }
>;

export const SCENARIO_ASSETS = {
    SUNDAE_IMAGES: {
        PNG: {
            type: 'image',
            src: `${ASSETS_BASE_URL}/sundae-images/sundae.png`,
        },
        SVG: {
            type: 'image',
            src: `${ASSETS_BASE_URL}/sundae-images/sundae.svg`,
        },
        WEBP: {
            type: 'image',
            src: `${ASSETS_BASE_URL}/sundae-images/sundae.webp`,
        },
        JPG: {
            type: 'image',
            src: `${ASSETS_BASE_URL}/sundae-images/sundae.jpg`,
        },
    },
    US_MAP: {
        STATES: { type: 'json', src: `${ASSETS_BASE_URL}/us-map/states.json` },
        COUNTIES: {
            type: 'json',
            src: `${ASSETS_BASE_URL}/us-map/counties.json`,
        },
    },
} satisfies Record<string, ScenarioAssets>;
