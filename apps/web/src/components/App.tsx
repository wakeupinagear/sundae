import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Engine, type EngineOptions } from '@repo/engine';
import { ENGINE_SCENARIOS } from '@repo/engine-scenarios';
import { Harness } from '@repo/react';

import { useAppStore } from '../store';
import { WebHarness } from '../utils/harness';
import { idToScenario, scenarioToID } from '../utils/scenarios';
import { ExampleList } from './ExampleList';

const DEFAULT_SCENARIO = 'stressTests-renderChaos';

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
    },
};

const readScenarioFromHash = () => {
    return idToScenario(window.location.hash.slice(1) || DEFAULT_SCENARIO);
};

export function App() {
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

    const { scenario, scenarioKey } = useMemo(() => {
        const scenario =
            ENGINE_SCENARIOS[categoryID]?.scenarios[scenarioID] || null;
        const scenarioKey = scenarioToID(categoryID, scenarioID);
        const url = new URL(window.location.href);
        url.hash = scenarioKey;
        window.history.replaceState({}, '', url.toString());

        return { scenario, scenarioKey };
    }, [categoryID, scenarioID]);

    const engineOptions = useMemo<Partial<EngineOptions>>(() => {
        return {
            debugOverlayEnabled: debugMode,
            engineTracesEnabled: debugMode,
            randomSeed: trueRandom
                ? (Math.random() * 2 ** 32) >>> 0
                : undefined,
        };
    }, [debugMode, trueRandom]);

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
