import { type ToEngineMsg } from '@repo/engine/worker';

export const ExtendedToEngineMsgType = {
    SCENARIO: 'scenario',
} as const;
export type ExtendedToEngineMsgType =
    (typeof ExtendedToEngineMsgType)[keyof typeof ExtendedToEngineMsgType];

interface ExtendedToEngineMsg_Scenario {
    type: typeof ExtendedToEngineMsgType.SCENARIO;
    categoryID: string;
    scenarioID: string;
}

export type ExtendedToEngineMsg = ToEngineMsg | ExtendedToEngineMsg_Scenario;
