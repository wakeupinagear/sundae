import { Entity } from '@repo/engine';
import { EngineScenario } from '@repo/engine-scenarios';
import { C_Shape } from '@repo/engine/components';
import { Scene } from '@repo/engine/scene';

class PongScene extends Scene {
    override create() {
        const ball = this.add(Entity, {
            name: 'Ball',
            position: { x: 300, y: 300 },
            scale: 100,
        });
        ball.addComponents(C_Shape, {
            name: 'Ball',
            shape: 'ELLIPSE',
            style: {
                fillStyle: 'red',
            },
        });
    }
}

export const pong: EngineScenario = async (harness) => {
    harness.engine.openScene(PongScene);

    await harness.step(100);
    harness.snapshot();
    await harness.step(2);
    harness.snapshot();
};
