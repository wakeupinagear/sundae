import type { EngineScenario } from '../types';

const LABEL_COLOR = '#AAAAAA';
const COLLIDER_COLOR = '#00FF00';
const BOUNDING_BOX_COLOR = '#FF0000';
const RAYCAST_COLOR = '#FFFF00';
const SUB_BULLET_SIZE = 12;

const subBullet = (text: string) =>
    `<|size=${SUB_BULLET_SIZE} color=${LABEL_COLOR}|>- ${text}<|/size /color /bold|>`;

const DEBUG_TEXT = `<|size=24 bold|>Debugging<|/size /bold|>

<|b|>Sundae<|/b|> has a built in <|b|>Debug Overlay<|/b|> that provides real-time debugging information about the engine.

It displays engine stats in the bottom-right corner of the screen:

- <|b|>FPS <|/b color=${LABEL_COLOR}|>- frames per second<|/color|>
- <|b|>Debug Traces <|/b color=${LABEL_COLOR}|>- timing information for slow functions<|/color|>
- <|b|>Render Commands <|/b color=${LABEL_COLOR}|>- number of commands being rendered<|/color|>
- <|b|>Physics <|/b color=${LABEL_COLOR}|>- number of entities opted into physics<|/color|>

It also renders visuals on top of the scene:

- <|b color=${BOUNDING_BOX_COLOR}|>Bounding Boxes <|/b color=${LABEL_COLOR}|>- the axis-aligned rectangles surrounding entities and components<|/color|>
    ${subBullet(`See the <|b color=${BOUNDING_BOX_COLOR}|>box<|/b color=${LABEL_COLOR}|> around this text!`)}
    ${subBullet('This is used to speed up lots of things, like culling and pointer checks.')}
- <|b color=${COLLIDER_COLOR}|>Colliders <|/b color=${LABEL_COLOR}|>- the shapes of all active colliders<|/color|>
    ${subBullet('See the shapes of the colliders around the circle!')}
    <|size=${SUB_BULLET_SIZE} color=${LABEL_COLOR}|>- This is used to speed up lots of things, like collision detection.<|/size /color /bold|>
- <|b color=${RAYCAST_COLOR}|>Raycasts <|/b color=${LABEL_COLOR}|>- the results of all active raycasts<|/color|>

Some of this profiling adds a performance penalty, so it's disabled by default.
`;

export const debugging: EngineScenario = (harness) => {
    harness.engine.openScene({
        name: 'Debugging',
        entities: [
            {
                type: 'text',
                name: 'Debugging',
                text: DEBUG_TEXT,
                color: 'white',
                trim: 'none',
                maxWidth: 600,
                fontSize: 16,
            },
        ],
    });
};
