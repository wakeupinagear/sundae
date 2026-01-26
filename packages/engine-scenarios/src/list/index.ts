import { type EngineScenario } from '../types';
import { ballPit } from './ballPit';
import { ballVortex } from './ballVortex';
import { infiniteCanvas } from './infiniteCanvas';
import { pong } from './pong';
import { renderChaos } from './renderChaos';
import { superSundaeBros } from './superSundaeBros';
import { typeErrors } from './type-errors';

export interface ScenarioMetadata {
    name: string;
    description: string;
    scenario: EngineScenario;
    skipInTests?: boolean;
    hideInDemos?: boolean;
}

export interface ScenarioCategory {
    name: string;
    description: string;
    scenarios: Record<string, ScenarioMetadata>;
}

export type ScenarioList = Record<string, ScenarioCategory>;

export const ENGINE_SCENARIOS: ScenarioList = {
    tools: {
        name: 'Tools',
        description: 'Tool scenarios',
        scenarios: {
            infiniteCanvas: {
                name: 'Infinite Canvas',
                description: 'An infinite canvas',
                scenario: infiniteCanvas,
            },
        },
    },
    games: {
        name: 'Games',
        description: 'Game scenarios',
        scenarios: {
            pong: {
                name: 'pong',
                description: 'A simple pong game',
                scenario: pong,
            },
            superSundaeBros: {
                name: 'Super Sundae Bros',
                description: 'A simple platformer game',
                scenario: superSundaeBros,
            },
        },
    },
    physics: {
        name: 'Physics',
        description: 'Physics scenarios',
        scenarios: {
            ballPit: {
                name: 'Ball Pit',
                description: 'So many balls',
                scenario: ballPit,
            },
            ballVortex: {
                name: 'Ball Vortex',
                description: 'A vortex of balls',
                scenario: ballVortex,
            },
        },
    },
    stressTests: {
        name: 'Stress Tests',
        description: 'Stress test scenarios',
        scenarios: {
            renderChaos: {
                name: 'Render Chaos',
                description: 'Funky visuals',
                scenario: renderChaos,
            },
        },
    },
    internal: {
        name: 'Internal',
        description: 'Internal scenarios',
        scenarios: {
            typeErrors: {
                name: 'Type Errors',
                description:
                    'Type error test case to validate engine type safety. Not an actual scenario.',
                scenario: typeErrors,
                skipInTests: true,
                hideInDemos: true,
            },
        },
    },
};
