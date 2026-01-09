import { Engine } from '@repo/engine';

export interface IEngineHarness {
    engine: Engine;

    step(n?: number): Promise<void>;
    snapshot(): void;
}

export type EngineScenario = (harness: IEngineHarness) => void | Promise<void>;
