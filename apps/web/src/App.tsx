import { useEffect, useMemo, useState } from 'react';

import { Engine, EngineOptions } from '@repo/engine';
import { scenarios } from '@repo/engine-scenarios/list';

import { EngineCanvas } from './EngineCanvas';
import { WebHarness } from './harness';
import { useAppStore } from './store';
import './style.css';

const DEFAULT_SCENARIO = 'renderChaos';

export function App() {
    const debugMode = useAppStore((state) => state.debugMode);
    const setDebugMode = useAppStore((state) => state.setDebugMode);

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

    const scenario = scenarioId ? scenarios[scenarioId] : null;

    const handleScenarioChange = (id: string) => {
        setScenarioId(id || null);
    };

    const engineOptions = useMemo<Partial<EngineOptions>>(() => {
        return {
            debugOverlayEnabled: debugMode,
        };
    }, [debugMode]);

    // Callback to run the scenario when engine is ready
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
                <EngineCanvas
                    key={scenarioId || 'default'}
                    engine={Engine}
                    onInitialized={onEngineReady}
                    width={800}
                    height={600}
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
                            {Object.entries(scenarios).map(([id, { name }]) => (
                                <option key={id} value={id}>
                                    {name}
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
                </div>
            </div>
        </div>
    );
}
