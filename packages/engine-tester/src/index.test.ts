import { Canvas } from 'skia-canvas';
import { beforeAll } from 'vitest';

import { scenarios } from '@repo/engine-scenarios/list';

import { defineSnapshotTest } from './test-utils/snapshot';

let canvas!: Canvas;
beforeAll(() => {
    canvas = new Canvas(1000, 750);
});

for (const scenarioMetadata of Object.values(scenarios)) {
    const { skipInTests, name, scenario } = scenarioMetadata;
    if (skipInTests) continue;

    defineSnapshotTest(name, scenario, { canvas });
}
