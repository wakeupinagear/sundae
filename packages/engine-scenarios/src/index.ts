import { DebugOverlayFlags } from '@repo/engine';
import type { AssetPreload } from '@repo/engine/asset';

import { SCENARIO_ASSETS, type ScenarioAssets } from './assets';
import { ballPit } from './list/ballPit';
import { ballVortex } from './list/ballVortex';
import { cursors } from './list/cursors';
import { debugging } from './list/debugging';
import { images } from './list/images';
import { infiniteCanvas } from './list/infiniteCanvas';
import { inputs } from './list/inputs';
import { layoutMode } from './list/layoutMode';
import { pong } from './list/pong';
import { primitives } from './list/primitives';
import { raycasts } from './list/raycasts';
import { renderChaos } from './list/renderChaos';
import { signals } from './list/signals';
import { superSundaeBros } from './list/superSundaeBros';
import { text } from './list/text';
import { textStressTest } from './list/textStressTest';
import { typeErrors } from './list/type-errors';
import { usMap } from './list/usMap';
import { zIndex } from './list/zIndex';
import type { EngineScenario } from './types';

export * from './types';
export * from './assets';

export interface ScenarioMetadata {
    name: string;
    description: string;
    run: EngineScenario;
    skipInTests?: boolean;
    maxCameras?: number;
    debugOverlayFlags?: DebugOverlayFlags;
    assets?: AssetPreload[];
}

export interface ScenarioCategory {
    name: string;
    description: string;
    scenarios: Record<string, ScenarioMetadata>;
    hideInDemos?: boolean;
}

export type ScenarioList = Record<string, ScenarioCategory>;

const assetsToPreloads = (assets: ScenarioAssets): AssetPreload[] => {
    return Object.values(assets).map((asset) => ({
        type: asset.type,
        src: asset.src,
    }));
};

export const ENGINE_SCENARIOS: ScenarioList = {
    features: {
        name: 'Features',
        description: 'Feature scenarios',
        scenarios: {
            primitives: {
                name: 'Primitives',
                description: 'Circle, rectangle, line, arrows, polygon',
                run: primitives,
            },
            images: {
                name: 'Images',
                description: 'Image scenarios',
                run: images,
                assets: assetsToPreloads(SCENARIO_ASSETS.SUNDAE_IMAGES),
            },
            text: {
                name: 'Text',
                description: 'Text rendering scenarios',
                run: text,
            },
            signals: {
                name: 'Signals',
                description: 'Signals',
                run: signals,
            },
            raycasts: {
                name: 'Raycasts',
                description: 'Raycast scenarios',
                run: raycasts,
                debugOverlayFlags:
                    DebugOverlayFlags.VISUAL_RAYCASTS |
                    DebugOverlayFlags.VISUAL_COLLIDERS,
            },
            inputs: {
                name: 'Keyboard Inputs',
                description: 'Interact with the engine',
                run: inputs,
            },
            cursors: {
                name: 'Pointer Cursor',
                description: 'Buttons that set cursor type on hover',
                run: cursors,
            },
            layoutMode: {
                name: 'Layout Mode',
                description: 'Row and column layout with text boxes',
                run: layoutMode,
            },
            zIndex: {
                name: 'Z-Index',
                description: 'Overlapping shapes with different draw order',
                run: zIndex,
            },
            debugging: {
                name: 'Debugging',
                description: 'Debugging scenarios',
                run: debugging,
                debugOverlayFlags: DebugOverlayFlags.ALL,
            },
        },
    },
    tools: {
        name: 'Tools',
        description: 'Tool scenarios',
        scenarios: {
            infiniteCanvas: {
                name: 'Infinite Canvas',
                description: 'An infinite canvas',
                run: infiniteCanvas,
            },
            usMap: {
                name: 'US Map',
                description: 'A map of the United States',
                run: usMap,
                assets: assetsToPreloads(SCENARIO_ASSETS.US_MAP),
            },
        },
    },
    games: {
        name: 'Games',
        description: 'Game scenarios',
        scenarios: {
            pong: {
                name: 'Pong',
                description: 'A simple pong game',
                run: pong,
                maxCameras: 1,
            },
            superSundaeBros: {
                name: 'Super Sundae Bros',
                description: 'A simple platformer game',
                run: superSundaeBros,
                maxCameras: 1,
            },
        },
    },
    physics: {
        name: 'Physics',
        description: 'Physics scenarios',
        scenarios: {
            ballPit: {
                name: 'Ball Pit',
                description: 'So many balls',
                run: ballPit,
            },
            ballVortex: {
                name: 'Ball Vortex',
                description: 'A vortex of balls',
                run: ballVortex,
            },
        },
    },
    stressTests: {
        name: 'Stress Tests',
        description: 'Stress test scenarios',
        scenarios: {
            renderChaos: {
                name: 'Render Chaos',
                description: 'Funky visuals',
                run: renderChaos,
            },
            textStressTest: {
                name: 'Text Stress Test',
                description: 'Procedural text with random style changes',
                run: textStressTest,
            },
        },
    },
    internal: {
        name: 'Internal',
        description: 'Internal scenarios',
        hideInDemos: true,
        scenarios: {
            typeErrors: {
                name: 'Type Errors',
                description:
                    'Type error test case to validate engine type safety. Not an actual scenario.',
                run: typeErrors,
                skipInTests: true,
            },
        },
    },
};
