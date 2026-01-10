import { EngineScenario } from '..';
import { pong } from './pong';
import { renderChaos } from './render-chaos';
import { typeErrors } from './type-errors';

interface ScenarioMetadata {
    name: string;
    description: string;
    scenario: EngineScenario;
    skipInTests?: boolean;
    hideInDemos?: boolean;
}

export const scenarios: Record<string, ScenarioMetadata> = {
    pong: {
        name: 'Pong',
        description: 'A simple pong game',
        scenario: pong,
    },
    renderChaos: {
        name: 'Render Chaos',
        description: 'Funky visuals',
        scenario: renderChaos,
    },
    typeErrors: {
        name: 'Type Errors',
        description:
            'Type error test case to validate engine type safety. Not an actual scenario.',
        scenario: typeErrors,
        skipInTests: true,
        hideInDemos: true,
    },
};
