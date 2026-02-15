import type { EngineScenario } from '../types';

const INVISIBLE_SPACE = '‎';
const mustacheLiteral = (text: string) =>
    `{${INVISIBLE_SPACE}{${text}}${INVISIBLE_SPACE}}`;

const INFO_TEXT = `<|b|>Signals<|/b|> let entities and components <|b|>subscribe<|/b|> to values in code and <|b|>react<|/b|> when those values change.

On every change, a callback will fire with the updated value.

For example, this text block is only created once. But, by referencing existing signals using ${mustacheLiteral('Mustache')} Syntax, the text will automatically update whenever one of those signals changes.

${mustacheLiteral('frameCount')} -> {{frameCount}}
${mustacheLiteral('mouseWorldX')} -> {{mouseWorldX}}
${mustacheLiteral('mouseWorldY')} -> {{mouseWorldY}}`;

export const signals: EngineScenario = async (harness) => {
    harness.engine.openScene({
        name: 'Signals',
        entities: [
            {
                type: 'text',
                text: INFO_TEXT,
                maxWidth: 600,
                fontSize: 16,
                trim: 'none',
            },
        ],
    });
};
