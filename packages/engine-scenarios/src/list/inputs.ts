import { type WebKey } from '@repo/engine';
import { type C_Rectangle } from '@repo/engine/components';
import { Entity, type EntityOptions } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import type { EngineScenario } from '../types';

const KEYS: WebKey[][] = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

const KEY_SIZE = 48;
const KEY_GAP = 24;

interface E_KeyOptions extends EntityOptions {
    key: WebKey;
}

class E_Key extends Entity {
    #key: WebKey;
    #background: C_Rectangle;

    constructor(options: E_KeyOptions) {
        super(options);

        this.#key = options.key;

        this.#background = this.setBackground({
            type: 'rectangle',
            lineColor: '#666666',
            lineWidth: 2,
        })[0] as C_Rectangle;
    }

    update() {
        if (this._engine.getKey(this.#key).down) {
            this.#background.setStyle({
                color: 'blue',
            });
        } else {
            this.#background.setStyle({
                color: 'rgba(0,0,0,0.5)',
            });
        }
    }
}

class EngineScene extends Scene {
    create(): void {
        const [keyboard] = this.createEntities({
            type: 'entity',
            layoutMode: 'column',
            gap: KEY_GAP,
        });

        for (const row of KEYS) {
            const [rowEntity] = this._engine.createEntitiesWithParent(
                [
                    {
                        type: 'entity',
                        layoutMode: 'row',
                        gap: KEY_GAP,
                    },
                ],
                keyboard,
            );

            this._engine.createEntitiesWithParent(
                row.map((key) => ({
                    type: E_Key,
                    name: `Key ${key}`,
                    key,
                    scale: KEY_SIZE,
                    components: [
                        {
                            type: 'text',
                            text: key.toUpperCase(),
                            fontSize: 0.5,
                            textAlign: 'center',
                        },
                    ],
                })),
                rowEntity,
            );
        }
    }
}

export const inputs: EngineScenario = (harness) => {
    harness.engine.openScene(EngineScene);
};
