import { type ToEngineMsg } from '@repo/engine/worker';

interface ToEngineMsg_ScenarioID {
    type: 'scenario';
    categoryID: string;
    scenarioID: string;
}

export type ExtendedToEngineMsg = ToEngineMsg | ToEngineMsg_ScenarioID;
