import { Engine } from '@repo/engine';
import { IEngineHarness } from '@repo/engine-scenarios';

export class WebHarness implements IEngineHarness {
    constructor(public engine: Engine) {}

    async step(n: number = 1): Promise<void> {
        // In the web app, we don't necessarily want to wait for frames in a blocking way
        // if the engine is already running. However, some scenarios might depend on it.
        // For now, we can just wait for N animation frames.
        for (let i = 0; i < n; i++) {
            await new Promise(requestAnimationFrame);
        }
    }

    snapshot(): void {
        console.log('Snapshot requested in web harness - ignoring for now');
    }
}
