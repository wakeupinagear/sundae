import { test } from 'vitest';

import { Engine } from '@repo/engine';

// test-utils/harness.ts
export interface EngineTestContext {
    engine: Engine;
    step: (n?: number) => void;
    snapshot: () => void;
    command: (fn: (e: Engine) => void) => void;
}

export function createHarness(): EngineTestContext {
    const engine = new Engine();
    return {
        engine,
        step(n = 1) {},
        command(fn) {
            fn(engine);
        },
        snapshot() {},
    };
}

export type SnapshotTest = (ctx: ReturnType<typeof createHarness>) => void;

export function defineSnapshotTest(name: string, fn: SnapshotTest) {
    test(name, () => {
        const ctx = createHarness();
        fn(ctx);
    });
}
