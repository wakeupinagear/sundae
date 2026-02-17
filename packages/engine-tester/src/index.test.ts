import { Canvas } from 'skia-canvas';
import { test } from 'vitest';

import { ENGINE_SCENARIOS } from '@repo/engine-scenarios';

import { SnapshotHarness } from './harness';

for (const scenarioMetadata of Object.values(ENGINE_SCENARIOS)) {
    for (const [
        scenarioID,
        { name, run, debugOverlayFlags, skipInTests },
    ] of Object.entries(scenarioMetadata.scenarios)) {
        if (skipInTests) continue;

        test(name, async () => {
            const canvas = new Canvas(800, 600);
            const harness = new SnapshotHarness(
                canvas,
                {
                    debugOverlay: debugOverlayFlags,
                },
                { testName: name, snapshotFolder: scenarioID },
            );

            await run(harness);

            if (harness.snapshotCount === 0) {
                await harness.step(12);
                await harness.snapshot();
            }
        });
    }
}
