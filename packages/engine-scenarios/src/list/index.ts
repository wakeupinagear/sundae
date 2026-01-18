import { EngineScenario } from '..';
import { ballPit } from './ballPit';
import { pong } from './pong';
import { renderChaos } from './renderChaos';
import { superSundaeBros } from './superSundaeBros';
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
    ballPit: {
        name: 'Ball Pit',
        description: 'So many balls',
        scenario: ballPit,
    },
    superSundaeBros: {
        name: 'Super Sundae Bros',
        description: 'A simple platformer game',
        scenario: superSundaeBros,
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
