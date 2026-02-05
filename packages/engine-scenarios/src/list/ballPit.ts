import { type Engine, type EngineOptions } from '@repo/engine';
import { type E_ShapeJSON } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import { type EngineScenario } from '../types';

const BALL_COLORS = ['red', 'blue', 'cyan', 'yellow', 'orange', 'green'];

class PitScene extends Scene {
    override create(_engine: Engine<EngineOptions>): void {
        const wallOptions: E_ShapeJSON = {
            type: 'shape',
            shape: 'RECT',
            color: '#DDDDDD',
            collision: true,
        };
        this.createEntities(
            {
                ...wallOptions,
                position: { x: 0, y: 300 },
                scale: { x: 800, y: 50 },
            },
            {
                ...wallOptions,
                position: { x: 350, y: 150 },
                scale: { x: 25, y: 400 },
            },
            {
                ...wallOptions,
                position: { x: -350, y: 150 },
                scale: { x: 25, y: 400 },
            },
        );

        for (let i = 0; i < 600; i++) {
            this.createEntities({
                type: 'shape',
                shape: 'ELLIPSE',
                scale: 5 + _engine.random() * 25,
                color: BALL_COLORS[
                    Math.floor(this._engine.random() * BALL_COLORS.length)
                ],
                position: {
                    x: 500 * (_engine.random() - 0.5),
                    y: 400 * (_engine.random() - 0.5),
                },
                collision: true,
                pointerTarget: true,
                mass: 1,
                hoverStyle: {
                    opacity: 0.5,
                },
            });
        }
    }
}

export const ballPit: EngineScenario = (harness) => {
    harness.engine.openScene(PitScene);
};
