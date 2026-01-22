import { Canvas } from 'skia-canvas';
import { beforeAll } from 'vitest';

import { scenarios } from '@repo/engine-scenarios/list';

import { defineSnapshotTest } from './snapshot';

let canvas!: Canvas;
beforeAll(() => {
    canvas = new Canvas(800, 600);
});

for (const scenarioMetadata of Object.values(scenarios)) {
    const { skipInTests, name, scenario } = scenarioMetadata;
    if (skipInTests) continue;

    defineSnapshotTest(name, scenario, { canvas });
}
