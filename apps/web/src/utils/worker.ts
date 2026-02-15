import { type Engine } from '@repo/engine';
import { ENGINE_SCENARIOS } from '@repo/engine-scenarios';
import { WorkerAssetLoader } from '@repo/engine/asset';
import { runEngineInWorker } from '@repo/engine/worker';

import { WebHarness } from './harness';
import { type ExtendedToEngineMsg, ExtendedToEngineMsgType } from './types';

let harness: WebHarness | null = null;

runEngineInWorker<Engine, ExtendedToEngineMsg>({
    assetLoader: new WorkerAssetLoader(),
    onMessage: (event, engine) => {
        const { data } = event;
        switch (data.type) {
            case ExtendedToEngineMsgType.SCENARIO: {
                const { categoryID, scenarioID } = data;
                if (!harness) {
                    harness = new WebHarness(engine);
                }

                const scenario =
                    ENGINE_SCENARIOS[categoryID]?.scenarios[scenarioID];
                if (scenario) {
                    engine.options = { assetPreloads: scenario.assets ?? [] };
                    scenario.run(harness);
                } else {
                    engine.warn('Scenario not found', categoryID, scenarioID);
                }

                break;
            }
            default:
                break;
        }
    },
});
