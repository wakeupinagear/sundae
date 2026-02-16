import { Scene } from '@repo/engine/scene';
import {
    PRIMARY_CAMERA_POINTER_WORLD_X,
    PRIMARY_CAMERA_POINTER_WORLD_Y,
    PRIMARY_CAMERA_WORLD_X,
    PRIMARY_CAMERA_WORLD_Y,
    SIGNAL_FRAME_COUNT,
    SIGNAL_POINTER_SCREEN_X,
    SIGNAL_POINTER_SCREEN_Y,
    SignalVariable,
} from '@repo/engine/signal';

import type { EngineScenario } from '../types';

const INVISIBLE_SPACE = '‎';
const mustacheLiteral = (text: string) =>
    `{${INVISIBLE_SPACE}{${text}}${INVISIBLE_SPACE}}`;

const CURRENT_TIME_SIGNAL = 'currentTime';

const INFO_TEXT = `<|b|>Signals<|/b|> let entities and components <|b|>subscribe<|/b|> to values in code and <|b|>react<|/b|> when those values change.

On every change, a callback will fire with the updated value.

For example, this text block is only created once. But, by referencing existing signals using ${mustacheLiteral('Mustache')} Syntax, the text will automatically update whenever one of those signals changes.

${mustacheLiteral(SIGNAL_FRAME_COUNT)} -> {{frameCount}}

${mustacheLiteral(SIGNAL_POINTER_SCREEN_X)} -> {{${SIGNAL_POINTER_SCREEN_X}}}
${mustacheLiteral(SIGNAL_POINTER_SCREEN_Y)} -> {{${SIGNAL_POINTER_SCREEN_Y}}}

${mustacheLiteral(PRIMARY_CAMERA_POINTER_WORLD_X)} -> {{${PRIMARY_CAMERA_POINTER_WORLD_X}}}
${mustacheLiteral(PRIMARY_CAMERA_POINTER_WORLD_Y)} -> {{${PRIMARY_CAMERA_POINTER_WORLD_Y}}}

${mustacheLiteral(PRIMARY_CAMERA_WORLD_X)} -> {{${PRIMARY_CAMERA_WORLD_X}}}
${mustacheLiteral(PRIMARY_CAMERA_WORLD_Y)} -> {{${PRIMARY_CAMERA_WORLD_Y}}}

A signal can also have a custom formatter for different types. Here's a custom signal for the current time, formatted in a few different ways.

${mustacheLiteral(CURRENT_TIME_SIGNAL)} -> {{${CURRENT_TIME_SIGNAL}}}
    ${mustacheLiteral(`${CURRENT_TIME_SIGNAL}:string`)}  -> {{${CURRENT_TIME_SIGNAL}:string}}
    ${mustacheLiteral(`${CURRENT_TIME_SIGNAL}:number`)}  -> {{${CURRENT_TIME_SIGNAL}:number}}
    ${mustacheLiteral(`${CURRENT_TIME_SIGNAL}:boolean`)} -> {{${CURRENT_TIME_SIGNAL}:boolean}}
`;

class SignalsScene extends Scene {
    #currentTimeSignal: SignalVariable<number> = new SignalVariable(
        CURRENT_TIME_SIGNAL,
        this._engine.now(),
        this.engine,
        {
            stringFormatter: (value: number) =>
                new Date(value).toLocaleString(),
        },
    );

    override create() {
        this.createEntity({
            type: 'text',
            text: INFO_TEXT,
            maxWidth: 600,
            fontSize: 16,
            horizontalAlignment: 'start',
        });
    }

    override update() {
        this.#currentTimeSignal.set(this._engine.now());

        this._engine.log(
            'Signals can also be used in console logs! The current time is',
            `{{${CURRENT_TIME_SIGNAL}}}`,
        );
    }
}

export const signals: EngineScenario = async (harness) => {
    harness.engine.openScene(SignalsScene);
};
