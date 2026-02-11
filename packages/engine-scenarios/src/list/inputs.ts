import { type WebKey } from '@repo/engine';
import { type C_Shape } from '@repo/engine/components';
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
    #background: C_Shape;

    constructor(options: E_KeyOptions) {
        super(options);

        this.#key = options.key;

        this.#background = this.setBackground({
            type: 'shape',
            shape: 'RECT',
            lineColor: '#666666',
            lineWidth: 2,
        })[0] as C_Shape;
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
        for (let y = 0; y < KEYS.length; y++) {
            const ROW = KEYS[y];
            for (let x = 0; x < ROW.length; x++) {
                const key = ROW[x];
                this.createEntity({
                    type: E_Key,
                    name: `Key ${key}`,
                    key,
                    position: {
                        x: (-ROW.length / 2 + x + 0.5) * (KEY_SIZE + KEY_GAP),
                        y: (-KEYS.length / 2 + y + 0.5) * (KEY_SIZE + KEY_GAP),
                    },
                    scale: KEY_SIZE,
                    components: [
                        {
                            type: 'text',
                            text: key.toUpperCase(),
                            fontSize: 0.5,
                            textAlign: 'center',
                        },
                    ],
                });
            }
        }
    }
}

export const inputs: EngineScenario = (harness) => {
    harness.engine.openScene(EngineScene);
};
