import { Vector } from '@repo/engine';
import { CollisionContact } from '@repo/engine';
import { EngineScenario } from '@repo/engine-scenarios';
import { E_Shape, E_Text, EntityOptions } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import { E_ShapeOptions } from '../../../engine/src/objects/shape';

const PLAYER_1_INPUT_AXIS = 'player1';
const PLAYER_2_INPUT_AXIS = 'player2';

interface E_PaddleOptions extends EntityOptions {
    inputAxis: string;
}

class E_Paddle extends E_Shape {
    #inputAxis: string;
    #speed: number = 1000;

    constructor(options: E_PaddleOptions) {
        super({
            ...options,
            shape: 'RECT',
            style: { fillStyle: 'white' },
            collision: true,
            mass: 1e6,
        });

        this.#inputAxis = options.inputAxis;
    }

    override update(deltaTime: number) {
        const input = this.engine.getAxis(this.#inputAxis);
        this.setPosition({
            x: this.position.x,
            y: this.position.y + input.value.y * this.#speed * deltaTime,
        });
    }

    reset() {
        this.setPosition({ x: this.position.x, y: 0 });
    }
}

interface E_BallOptions extends EntityOptions {
    pongScene: PongScene;
}

class E_Ball extends E_Shape {
    #scene: PongScene;

    #direction: Vector = new Vector(0, 0);
    #speed: number = 500;

    constructor(options: E_BallOptions) {
        super({
            ...options,
            shape: 'ELLIPSE',
            style: { fillStyle: 'white' },
            collision: true,
            rigidbody: true,
        });

        this.#scene = options.pongScene;
        this.reset();
    }

    override update(deltaTime: number) {
        this.move(this.#direction.mul(this.#speed * deltaTime));

        const canvasSize = this.engine.canvasSize;
        if (canvasSize) {
            if (this.position.x < -canvasSize.x / 2) {
                this.#scene.score('player2');
                this.reset();
            }
            if (this.position.x > canvasSize.x / 2) {
                this.#scene.score('player1');
                this.reset();
            }
        }
    }

    override onCollision(contact: CollisionContact) {
        const dot = this.#direction.dot(contact.contactNormal);
        this.#direction.subMut(contact.contactNormal.scaleBy(2 * dot));
    }

    reset() {
        this.setPosition(0);
        const side = this.engine.random() > 0.5 ? 0 : 180;
        const angleDeg = side + (this.engine.random() * 90 - 45);
        const angleRad = (angleDeg * Math.PI) / 180;
        this.#direction.set(Vector.fromAngle(angleRad));
    }
}

class PongScene extends Scene {
    #ball!: E_Ball;
    #scoreText!: E_Text;

    #score1 = 0;
    #score2 = 0;

    override create() {
        this.#scoreText = this.createEntity({
            type: 'text',
            name: 'Score Text',
            text: '0-1',
            fontSize: 300,
            textAlign: 'center',
            style: {
                fillStyle: '#222222',
            },
            zIndex: -1,
        }) as E_Text;

        this.createEntities(
            {
                type: E_Paddle,
                inputAxis: PLAYER_1_INPUT_AXIS,
                name: 'Paddle 1',
                position: { x: -350, y: 0 },
                scale: { x: 20, y: 150 },
            },
            {
                type: E_Paddle,
                inputAxis: PLAYER_2_INPUT_AXIS,
                name: 'Paddle 2',
                position: { x: 350, y: 0 },
                scale: { x: 20, y: 150 },
            },
        );

        const wallOptions: E_ShapeOptions = {
            shape: 'RECT',
            scale: { x: 1000, y: 100 },
            style: {
                fillStyle: '#BBBBBB',
            },
            collision: true,
            kinematic: true,
        };

        this.createEntities(
            {
                type: 'shape',
                name: 'Top Wall',
                position: { x: 0, y: -300 },
                ...wallOptions,
            },
            {
                type: 'shape',
                name: 'Bottom Wall',
                position: { x: 0, y: 300 },
                ...wallOptions,
            },
        );

        this.#ball = this.createEntity({
            type: E_Ball,
            name: 'Ball',
            scale: { x: 20, y: 20 },
            pongScene: this,
        });
    }

    override update() {
        this.#scoreText.text = `${this.#score1}-${this.#score2}`;
    }

    score(winner: 'player1' | 'player2') {
        if (winner === 'player1') {
            this.#score1++;
        } else {
            this.#score2++;
        }

        this.#ball.reset();
    }
}

export const pong: EngineScenario = async (harness) => {
    harness.engine.options = {
        inputConfigs: {
            [PLAYER_1_INPUT_AXIS]: {
                type: 'axis',
                up: 'w',
                down: 's',
            },
            [PLAYER_2_INPUT_AXIS]: {
                type: 'axis',
                up: 'ArrowUp',
                down: 'ArrowDown',
            },
        },
    };

    harness.engine.openScene(PongScene);

    await harness.step(100);
    harness.snapshot();
    await harness.step(2);
    harness.snapshot();
};
