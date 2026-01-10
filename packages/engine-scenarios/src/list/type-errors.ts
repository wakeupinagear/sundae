import { Scene } from '@repo/engine/scene';

import { EngineScenario } from '..';

class TypeErrorsScene extends Scene {
    override create() {
        this.createEntity({
            name: 'good',
        });

        // @ts-expect-error - `text` requires `type: 'text'`
        this.createEntity({
            name: 'bad',
            text: 'nope',
        });
    }
}

export const typeErrors: EngineScenario = async (harness) => {
    harness.engine.openScene(TypeErrorsScene);

    harness.engine.createEntities(
        {
            name: 'good',
        },
        {
            name: 'also good',
        },
    );

    // @ts-expect-error - missing `type: 'text'`
    harness.engine.createEntities({
        text: 'bad',
    });
    harness.engine.createEntities({
        type: 'text',
        text: 'good',
    });
    // @ts-expect-error - missing `type: 'text'`
    harness.engine.createEntities(
        {
            text: 'bad',
        },
        {
            text: 'bad',
        },
    );
    harness.engine.createEntities(
        {
            type: 'text',
            text: 'good',
        },
        {
            type: 'text',
            text: 'good',
        },
    );
};
