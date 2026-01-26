import { useEffect, useMemo, useState } from 'react';

import { type Engine, type EngineOptions } from '@repo/engine';
import { ENGINE_SCENARIOS } from '@repo/engine-scenarios';
import { Harness } from '@repo/react';

import { WebHarness } from './harness';
import { useAppStore } from './store';
import './style.css';

const SCENARIOS = Object.fromEntries(
    Object.entries(ENGINE_SCENARIOS).filter(
        ([_, { hideInDemos }]) => !hideInDemos,
    ),
);

const DEFAULT_SCENARIO = 'renderChaos';

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

export function App() {
    const debugMode = useAppStore((state) => state.debugMode);
    const setDebugMode = useAppStore((state) => state.setDebugMode);
    const trueRandom = useAppStore((state) => state.trueRandom);
    const setTrueRandom = useAppStore((state) => state.setTrueRandom);

    const [scenarioId, setScenarioId] = useState<string | null>(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('exampleID') || DEFAULT_SCENARIO;
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (scenarioId) {
            params.set('exampleID', scenarioId);
        } else {
            params.delete('exampleID');
        }
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
    }, [scenarioId]);

    const scenario = scenarioId ? SCENARIOS[scenarioId] : null;

    const handleScenarioChange = (id: string) => {
        setScenarioId(id || null);
    };

    const engineOptions = useMemo<Partial<EngineOptions>>(() => {
        return {
            debugOverlayEnabled: debugMode,
            engineTracesEnabled: debugMode,
            randomSeed: trueRandom
                ? (Math.random() * 2 ** 32) >>> 0
                : undefined,
        };
    }, [debugMode, trueRandom]);

    const onEngineReady = useMemo(() => {
        return (engine: Engine) => {
            if (scenario) {
                const harness = new WebHarness(engine);
                scenario.scenario(harness);
            }
        };
    }, [scenario]);

    return (
        <div className="p-4 flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-bold">Engine Scenarios</h1>
            <div className="flex flex-col gap-4">
                <Harness
                    key={scenarioId || 'default'}
                    onInitialized={onEngineReady}
                    width={800}
                    height={600}
                    initialEngineOptions={INITIAL_ENGINE_OPTIONS}
                    engineOptions={engineOptions}
                />
                <div className="flex justify-between w-full">
                    <div className="flex gap-4 items-center">
                        <label
                            htmlFor="scenario-select"
                            className="font-medium"
                        >
                            Select Scenario:
                        </label>
                        <select
                            id="scenario-select"
                            className="border p-1 rounded"
                            value={scenarioId || ''}
                            onChange={(e) =>
                                handleScenarioChange(e.target.value)
                            }
                        >
                            {Object.entries(SCENARIOS).map(([id, { name }]) => (
                                <option key={id} value={id}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-8 items-center">
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
        </div>
    );
}
