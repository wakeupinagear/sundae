import { type Engine, type EngineOptions } from '@repo/engine';
import { type C_DrawableOptions, Component } from '@repo/engine/components';
import { type EntityOptions } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import type { EngineScenario } from '../types';

const RAYCAST_COUNT = 100;
const RAYCAST_MAX_DISTANCE = 500;
const CUBE_COUNT = 40;
const CUBE_SIZE_MIN = 15;
const CUBE_SIZE_MAX = 60;
const MIN_RADIUS = 120;
const MAX_RADIUS = 320;
const EMITTER_ROTATION_DEG_PER_SEC = 15;

class C_RaycastEmitter extends Component {
    override update(deltaTime: number): boolean | void {
        this.entity.rotate(EMITTER_ROTATION_DEG_PER_SEC * deltaTime);
        const rotationRad = (this.entity.rotation * Math.PI) / 180;
        for (let i = 0; i < RAYCAST_COUNT; i++) {
            const angle = (i / RAYCAST_COUNT) * 2 * Math.PI + rotationRad;
            this.engine.raycast({
                origin: { x: 0, y: 0 },
                direction: {
                    x: Math.cos(angle),
                    y: Math.sin(angle),
                },
                maxDistance: RAYCAST_MAX_DISTANCE,
            });
        }
    }
}

class RaycastsScene extends Scene {
    override create(_engine: Engine<EngineOptions>): void {
        for (let i = 0; i < CUBE_COUNT; i++) {
            const size =
                CUBE_SIZE_MIN +
                _engine.random() * (CUBE_SIZE_MAX - CUBE_SIZE_MIN);
            const angle = _engine.random() * 2 * Math.PI;
            const radius =
                MIN_RADIUS + _engine.random() * (MAX_RADIUS - MIN_RADIUS);
            const engineOptions: C_DrawableOptions & EntityOptions = {
                position: {
                    x: Math.cos(angle) * radius,
                    y: Math.sin(angle) * radius,
                },
                scale: size,
                color: `hsl(${_engine.random() * 360}, 60%, 50%)`,
                collision: 'solid',
            };

            if (_engine.random() < 0.7) {
                this.createEntity({
                    ...engineOptions,
                    type: 'rectangle',
                    name: `rect_${i}`,
                });
            } else {
                this.createEntity({
                    ...engineOptions,
                    type: 'circle',
                    name: `circle_${i}`,
                });
            }
        }

        const emitter = this.createEntity({
            type: 'entity',
            name: 'RaycastEmitter',
            position: { x: 0, y: 0 },
        });
        emitter.addComponent({
            type: 'circle',
            name: 'EmitterCircle',
            color: 'blue',
        });
        emitter.addComponent({
            type: C_RaycastEmitter,
            name: 'RaycastEmitter',
        });
    }
}

export const raycasts: EngineScenario = (harness) => {
    harness.engine.openScene(RaycastsScene);
};
