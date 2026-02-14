import { Canvas } from 'skia-canvas';
import { beforeAll } from 'vitest';

import { ENGINE_SCENARIOS } from '@repo/engine-scenarios';

import { defineSnapshotTest } from './snapshot';

let canvas!: Canvas;
beforeAll(() => {
    canvas = new Canvas(800, 600);
});

for (const scenarioMetadata of Object.values(ENGINE_SCENARIOS)) {
    for (const {
        skipInTests,
        name,
        scenario,
        debugOverlayFlags,
    } of Object.values(scenarioMetadata.scenarios)) {
        if (skipInTests) continue;

        defineSnapshotTest(name, scenario, { canvas, debugOverlayFlags });
    }
}
