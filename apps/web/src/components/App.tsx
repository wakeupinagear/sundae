import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Engine, type EngineOptions } from '@repo/engine';
import { ENGINE_SCENARIOS } from '@repo/engine-scenarios';
import { Harness } from '@repo/react';

import { useAppStore } from '../store';
import { WebHarness } from '../utils/harness';
import { idToScenario, scenarioToID } from '../utils/scenarios';
import { ExampleList } from './ExampleList';

const DEFAULT_SCENARIO = 'stressTests-renderChaos';
const MAX_CAMERAS = 64;

const INITIAL_ENGINE_OPTIONS: Partial<EngineOptions> = {
    cameraOptions: {
        canDrag: true,
        bounds: {
            x1: -400,
            x2: 400,
            y1: -300,
            y2: 300,
        },
        scrollMode: 'all',
        clearColor: 'black',
    },
};

const readScenarioFromHash = () => {
    return idToScenario(window.location.hash.slice(1) || DEFAULT_SCENARIO);
};

type NormalizedRect = {
    offset: { x: number; y: number };
    scale: { x: number; y: number };
};

const makeGridCameras = (count: number): Record<string, NormalizedRect> => {
    const hash = (Math.random() * 2 ** 32) >>> 0;
    if (count <= 1) {
        return {
            [`0-${hash}`]: { offset: { x: 0, y: 0 }, scale: { x: 1, y: 1 } },
        };
    }

    const cols = Math.ceil(Math.sqrt(count));
    const fullRows = Math.floor(count / cols);
    const remainder = count - fullRows * cols;
    const totalRows = fullRows + (remainder > 0 ? 1 : 0);
    const cameras: Record<string, NormalizedRect> = {};
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const isRemainderRow = remainder > 0 && row === fullRows;
        const rowWidth = isRemainderRow ? remainder : cols;
        const col = isRemainderRow ? i - fullRows * cols : i % cols;
        cameras[`${i}-${hash}`] = {
            offset: { x: col / rowWidth, y: row / totalRows },
            scale: { x: 1 / rowWidth, y: 1 / totalRows },
        };
    }

    return cameras;
};

export function App() {
    const cameraCount = useAppStore((state) => state.cameraCount);
    const setCameraCount = useAppStore((state) => state.setCameraCount);
    const debugMode = useAppStore((state) => state.debugMode);
    const setDebugMode = useAppStore((state) => state.setDebugMode);
    const trueRandom = useAppStore((state) => state.trueRandom);
    const setTrueRandom = useAppStore((state) => state.setTrueRandom);

    const [[categoryID, scenarioID], setScenario] =
        useState<[string, string]>(readScenarioFromHash);
    useEffect(() => {
        const onHashChange = () => {
            setScenario(readScenarioFromHash());
        };
        window.addEventListener('hashchange', onHashChange);

        return () => {
            window.removeEventListener('hashchange', onHashChange);
        };
    }, []);

    const { scenario, scenarioKey, maxCameras, canChangeCameraCount } =
        useMemo(() => {
            const scenario =
                ENGINE_SCENARIOS[categoryID]?.scenarios[scenarioID] || null;
            const scenarioKey = scenarioToID(categoryID, scenarioID);
            const url = new URL(window.location.href);
            url.hash = scenarioKey;
            window.history.replaceState({}, '', url.toString());

            const maxCameras = scenario?.maxCameras ?? MAX_CAMERAS;

            return {
                scenario,
                scenarioKey,
                maxCameras,
                canChangeCameraCount: maxCameras > 1,
            };
        }, [categoryID, scenarioID]);

    const engineOptions = useMemo<Partial<EngineOptions>>(() => {
        const options: Partial<EngineOptions> = {
            cameras: makeGridCameras(Math.min(cameraCount, maxCameras)),
            debugOverlayEnabled: debugMode,
            engineTracesEnabled: debugMode,
            randomSeed: trueRandom
                ? (Math.random() * 2 ** 32) >>> 0
                : undefined,
        };

        return options;
    }, [debugMode, trueRandom, cameraCount, maxCameras]);

    const onEngineReady = useCallback(
        (engine: Engine) => {
            if (scenario) {
                const harness = new WebHarness(engine);
                scenario.scenario(harness);
            }
        },
        [scenario],
    );

    const canvasContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="flex items-stretch justify-stretch gap-4 h-screen">
            <div>
                <div className="flex flex-col gap-2 h-full">
                    <ExampleList
                        selectedCategoryID={categoryID}
                        selectedScenarioID={scenarioID}
                    />
                    <div className="mt-auto flex flex-col gap-2 p-2">
                        <div
                            className={clsx(
                                'flex gap-2 items-center transition-opacity',
                                {
                                    'opacity-50': !canChangeCameraCount,
                                },
                            )}
                        >
                            <label
                                htmlFor="cameraCount"
                                className="font-medium"
                            >
                                Cameras
                            </label>
                            <select
                                id="cameraCount"
                                value={Math.max(
                                    Math.min(cameraCount, MAX_CAMERAS),
                                    1,
                                )}
                                onChange={(e) =>
                                    setCameraCount(Number(e.target.value))
                                }
                                disabled={!canChangeCameraCount}
                            >
                                {Array(Math.min(MAX_CAMERAS, maxCameras))
                                    .fill(0)
                                    .map((_, index) => (
                                        <option key={index} value={index + 1}>
                                            {index + 1}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className="flex gap-2 items-center">
                            <label htmlFor="debug" className="font-medium">
                                Debug Mode
                            </label>
                            <input
                                type="checkbox"
                                id="debug"
                                checked={debugMode}
                                onChange={(e) => setDebugMode(e.target.checked)}
                            />
                        </div>
                        <div className="flex gap-2 items-center">
                            <label htmlFor="trueRandom" className="font-medium">
                                True Random
                            </label>
                            <input
                                type="checkbox"
                                id="trueRandom"
                                checked={trueRandom}
                                onChange={(e) =>
                                    setTrueRandom(e.target.checked)
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className="size-full overflow-hidden" ref={canvasContainerRef}>
                <Harness
                    key={scenarioKey}
                    containerRef={canvasContainerRef}
                    onEngineReady={onEngineReady}
                    initialEngineOptions={INITIAL_ENGINE_OPTIONS}
                    engineOptions={engineOptions}
                />
            </div>
        </div>
    );
}
