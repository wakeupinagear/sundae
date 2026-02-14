const VITE_BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env
    ?.BASE_URL;
const NORMALIZED_BASE_URL = (VITE_BASE_URL || '/').replace(/\/+$/, '');

const ASSETS_BASE_URL = `${NORMALIZED_BASE_URL}/scenario-assets`;

export const SCENARIO_ASSETS = {
    US_MAP: {
        STATES: `${ASSETS_BASE_URL}/usMap/states.json`,
        COUNTIES: `${ASSETS_BASE_URL}/usMap/counties.json`,
    },
};
