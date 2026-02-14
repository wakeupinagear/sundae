const VITE_BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env
    ?.BASE_URL;
const NORMALIZED_BASE_URL = (VITE_BASE_URL || '/').replace(/\/+$/, '');

const ASSETS_BASE_URL = `${NORMALIZED_BASE_URL}/scenario-assets`;

export const SCENARIO_ASSETS = {
    SUNDAE_IMAGES: {
        PNG: `${ASSETS_BASE_URL}/sundae-images/sundae.png`,
        SVG: `${ASSETS_BASE_URL}/sundae-images/sundae.svg`,
        WEBP: `${ASSETS_BASE_URL}/sundae-images/sundae.webp`,
        JPG: `${ASSETS_BASE_URL}/sundae-images/sundae.jpg`,
    },
    US_MAP: {
        STATES: `${ASSETS_BASE_URL}/us-map/states.json`,
        COUNTIES: `${ASSETS_BASE_URL}/us-map/counties.json`,
    },
};
