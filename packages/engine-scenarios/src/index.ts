import { DEBUG_OVERLAY_SCENE_NAME, DebugOverlayFlags } from '@repo/engine';
import { PointerButton } from '@repo/engine/pointer';

import { SCENARIO_ASSETS, type ScenarioAssets } from './assets';
import { ballPit } from './list/ballPit';
import { ballVortex } from './list/ballVortex';
import {
    CSS_COLOR_VARIABLES_STYLES_USED,
    cssColorVariables,
} from './list/cssColorVariables';
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
import type { EngineScenario, IEngineHarness } from './types';

export * from './types';
export * from './assets';

export interface ScenarioMetadata {
    name: string;
    description: string;
    run: EngineScenario;
    skipInTests?: boolean;
    maxCameras?: number;
    debugOverlayFlags?: DebugOverlayFlags;
    stylePropertyValuePreloads?: string[];
}

export interface ScenarioCategory {
    name: string;
    description: string;
    scenarios: Record<string, ScenarioMetadata>;
    hideInDemos?: boolean;
}

export type ScenarioList = Record<string, ScenarioCategory>;

type ScenarioMiddleware<T extends unknown[]> = (
    scenario: EngineScenario,
    ...args: [...T] | []
) => (harness: IEngineHarness) => void;

const defaultOptions: ScenarioMiddleware<ScenarioAssets[]> =
    (scenario, ...assets) =>
    (harness) => {
        harness.engine.options = {
            cameraOptions: {
                clearColor: '#222222',
                canDrag: true,
                dragButtons: [
                    PointerButton.LEFT,
                    PointerButton.MIDDLE,
                    PointerButton.RIGHT,
                ],
                bounds: {
                    x1: -400,
                    x2: 400,
                    y1: -300,
                    y2: 300,
                },
                scrollMode: 'all',
            },
            assetPreloads: assets.flatMap((assets) =>
                Object.values(assets).map((asset) => ({
                    type: asset.type,
                    src: asset.src,
                })),
            ),
        };
        scenario(harness);
    };

const dynamicCamera: ScenarioMiddleware<[number]> =
    (scenario, padding = 64) =>
    (harness) => {
        harness.engine.options = {
            onSceneOpened: (scene) => {
                if (scene.name !== DEBUG_OVERLAY_SCENE_NAME) {
                    const cameras = harness.engine.getCameras();
                    for (const cameraID of Object.keys(cameras)) {
                        const target = harness.engine.moveCameraToFit(
                            scene.rootEntity,
                            true,
                            padding,
                            cameraID,
                        );
                        if (target) {
                            harness.engine.setCameraResetTarget(
                                target,
                                cameraID,
                            );
                        }
                    }
                }
            },
            cameraOptions: {
                fitOnStartup: true,
                fitOptions: {
                    instant: true,
                    padding,
                },
            },
        };
        scenario(harness);
    };

export const ENGINE_SCENARIOS: ScenarioList = {
    features: {
        name: 'Features',
        description: 'Feature scenarios',
        scenarios: {
            primitives: {
                name: 'Primitives',
                description: 'Circle, rectangle, line, arrows, polygon',
                run: dynamicCamera(defaultOptions(primitives)),
            },
            images: {
                name: 'Images',
                description: 'Image scenarios',
                run: dynamicCamera(
                    defaultOptions(images, SCENARIO_ASSETS.SUNDAE_IMAGES),
                ),
            },
            text: {
                name: 'Text',
                description: 'Text rendering scenarios',
                run: dynamicCamera(defaultOptions(text), -128),
            },
            cssColors: {
                name: 'CSS Colors',
                description: 'CSS color scenarios',
                run: dynamicCamera(defaultOptions(cssColorVariables)),
                stylePropertyValuePreloads: CSS_COLOR_VARIABLES_STYLES_USED,
            },
            signals: {
                name: 'Signals',
                description: 'Signals',
                run: dynamicCamera(defaultOptions(signals)),
            },
            inputs: {
                name: 'Keyboard Inputs',
                description: 'Interact with the engine',
                run: dynamicCamera(defaultOptions(inputs)),
            },
            cursors: {
                name: 'Pointer Cursor',
                description: 'Buttons that set cursor type on hover',
                run: dynamicCamera(defaultOptions(cursors)),
            },
            layoutMode: {
                name: 'Layout Mode',
                description: 'Row and column layout with text boxes',
                run: dynamicCamera(defaultOptions(layoutMode)),
            },
            zIndex: {
                name: 'Z-Index',
                description: 'Overlapping shapes with different draw order',
                run: dynamicCamera(defaultOptions(zIndex)),
            },
            debugging: {
                name: 'Debugging',
                description: 'Debugging scenarios',
                run: dynamicCamera(defaultOptions(debugging)),
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
                run: defaultOptions(usMap, SCENARIO_ASSETS.US_MAP),
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
                run: dynamicCamera(defaultOptions(pong)),
                maxCameras: 1,
            },
            superSundaeBros: {
                name: 'Super Sundae Bros',
                description: 'A simple platformer game',
                run: defaultOptions(superSundaeBros),
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
                run: dynamicCamera(defaultOptions(ballPit)),
            },
            ballVortex: {
                name: 'Ball Vortex',
                description: 'A vortex of balls',
                run: dynamicCamera(defaultOptions(ballVortex)),
            },
            raycasts: {
                name: 'Raycasts',
                description: 'Raycast scenarios',
                run: dynamicCamera(defaultOptions(raycasts), 32),
                debugOverlayFlags:
                    DebugOverlayFlags.VISUAL_RAYCASTS |
                    DebugOverlayFlags.VISUAL_COLLIDERS,
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
                run: dynamicCamera(defaultOptions(renderChaos)),
            },
            textStressTest: {
                name: 'Text Stress Test',
                description: 'Procedural text with random style changes',
                run: dynamicCamera(defaultOptions(textStressTest)),
                maxCameras: 1,
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
                run: dynamicCamera(defaultOptions(typeErrors)),
                skipInTests: true,
            },
        },
    },
};
