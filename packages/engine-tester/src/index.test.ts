import { Canvas } from 'skia-canvas';
import { beforeAll } from 'vitest';

import { scenarios } from '@repo/engine-scenarios/list';

import { defineSnapshotTest } from './test-utils/snapshot';

let canvas!: Canvas;
beforeAll(() => {
    canvas = new Canvas(1000, 750);
});

for (const scenario of Object.values(scenarios)) {
    defineSnapshotTest(scenario.name, scenario.scenario, { canvas });
}
