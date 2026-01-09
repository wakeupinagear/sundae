import { EngineScenario } from '..';
import { pong } from './pong';
import { renderChaos } from './render-chaos';

interface ScenarioMetadata {
    name: string;
    description: string;
    scenario: EngineScenario;
}

export const scenarios: Record<string, ScenarioMetadata> = {
    pong: {
        name: 'Pong',
        description: 'A simple pong game',
        scenario: pong,
    },
    renderChaos: {
        name: 'Render Chaos',
        description: 'A test scenario',
        scenario: renderChaos,
    },
};
