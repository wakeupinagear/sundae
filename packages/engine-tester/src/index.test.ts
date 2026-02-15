import { Canvas } from 'skia-canvas';
import { beforeAll, test } from 'vitest';

import { ENGINE_SCENARIOS } from '@repo/engine-scenarios';

import { SnapshotHarness } from './harness';

let canvas!: Canvas;
beforeAll(() => {
    canvas = new Canvas(800, 600);
});

for (const scenarioMetadata of Object.values(ENGINE_SCENARIOS)) {
    for (const {
        name,
        run,
        debugOverlayFlags,
        assets = {},
        skipInTests,
    } of Object.values(scenarioMetadata.scenarios)) {
        if (skipInTests) continue;

        test(name, async () => {
            const harness = new SnapshotHarness(
                canvas,
                {
                    debugOverlay: debugOverlayFlags,
                    assetPreloads: Object.values(assets).map((asset) => ({
                        type: asset.type,
                        src: asset.src,
                    })),
                },
                { testName: name },
            );

            await run(harness);

            if (harness.snapshotCount === 0) {
                await harness.step(12);
                harness.snapshot();
            }
        });
    }
}
