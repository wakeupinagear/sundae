import { type Engine, type EngineOptions, Vector } from '@repo/engine';
import { type E_Shape, type E_ShapeJSON } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import { type EngineScenario } from '../types';

const BALL_COLORS = ['red', 'blue', 'cyan', 'yellow', 'orange', 'green'];
const HEXAGON_RADIUS = 350;
const WALL_THICKNESS = 25;
const WALL_LENGTH = HEXAGON_RADIUS * 1.1;

class VortexScene extends Scene {
    #arrow!: E_Shape;

    #gravityAngleDegrees: number = 90;

    override create(_engine: Engine<EngineOptions>): void {
        this.#arrow = this.createEntity({
            type: 'shape',
            shape: 'LINE',
            endTip: { type: 'arrow', length: 100 },
            style: {
                strokeStyle: '#222222',
                lineWidth: 16,
            },
            zIndex: -1,
        }) as E_Shape;
        this.#syncArrow();

        const wallOptions: E_ShapeJSON = {
            type: 'shape',
            shape: 'RECT',
            style: { fillStyle: '#DDDDDD' },
            collision: true,
            kinematic: true,
        };

        const sideDistance = HEXAGON_RADIUS * Math.cos(Math.PI / 6);
        const walls: E_ShapeJSON[] = [];
        for (let i = 0; i < 6; i++) {
            const angleRad = ((i + 0.5) * Math.PI) / 3;
            const x = Math.cos(angleRad) * sideDistance;
            const y = Math.sin(angleRad) * sideDistance;
            const angleDegrees = (angleRad * 180) / Math.PI;
            const rotationDegrees = angleDegrees;

            walls.push({
                ...wallOptions,
                position: { x, y },
                scale: { x: WALL_THICKNESS, y: WALL_LENGTH },
                rotation: rotationDegrees,
            });
        }

        this.createEntities(...walls);

        for (let i = 0; i < 600; i++) {
            this.createEntities({
                type: 'shape',
                shape: 'ELLIPSE',
                scale: 2.5 + _engine.random() * 20,
                style: {
                    fillStyle:
                        BALL_COLORS[
                            Math.floor(
                                this._engine.random() * BALL_COLORS.length,
                            )
                        ],
                },
                position: {
                    x: 200 * (_engine.random() - 0.5),
                    y: 200 * (_engine.random() - 0.5),
                },
                collision: true,
                pointerTarget: true,
                onPointerEnter: (collider) => {
                    (collider.entity as E_Shape).shape.setOpacity(0.5);
                },
                onPointerLeave: (collider) => {
                    (collider.entity as E_Shape).shape.setOpacity(1);
                },
                mass: 1,
            });
        }
    }

    override update(_deltaTime: number): void {
        this.#gravityAngleDegrees -= 60 * _deltaTime;

        const angleRadians = (this.#gravityAngleDegrees * Math.PI) / 180;
        const direction = Vector.fromAngle(angleRadians);
        this.engine.physicsSystem.gravityDirection = direction;

        this.#syncArrow();
    }

    #syncArrow(): void {
        const direction = this.engine.physicsSystem.gravityDirection;
        this.#arrow.shape.setEnd(direction.scaleBy(100));
        this.#arrow.shape.setStart(direction.scaleBy(-100));
    }
}

export const ballVortex: EngineScenario = (harness) => {
    harness.engine.openScene(VortexScene);
};
