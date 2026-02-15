import { type Engine } from '@repo/engine';
import { ENGINE_SCENARIOS } from '@repo/engine-scenarios';
import { runEngineInWorker } from '@repo/engine/worker';

import { WebHarness } from './harness';
import type { ExtendedToEngineMsg } from './types';

let harness: WebHarness | null = null;

runEngineInWorker<Engine, ExtendedToEngineMsg>({
    onMessage: (event, engine) => {
        switch (event.data.type) {
            case 'scenario': {
                const { categoryID, scenarioID } = event.data;
                if (!harness) {
                    harness = new WebHarness(engine);
                }

                const scenario =
                    ENGINE_SCENARIOS[categoryID]?.scenarios[scenarioID];
                scenario?.run(harness);

                break;
            }
            default:
                break;
        }
    },
});
