import { Vector } from '@repo/engine';
import { type EngineScenario } from '@repo/engine-scenarios';
import { E_Shape, type E_ShapeOptions, type E_Text, type EntityOptions } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

const PLAYER_1_INPUT_AXIS = 'player1';
const PLAYER_2_INPUT_AXIS = 'player2';

const BALL_STARTING_SPEED = 500;
const PADDLE_SPEED = 1000;

interface E_PaddleOptions extends EntityOptions {
    inputAxis: string;
}

class E_Paddle extends E_Shape {
    #inputAxis: string;

    constructor(options: E_PaddleOptions) {
        super({
            ...options,
            shape: 'RECT',
            style: { fillStyle: 'white' },
            collision: true,
            mass: 1e6,
            bounce: 1
        });

        this.#inputAxis = options.inputAxis;
    }

    override update() {
        const input = this.engine.getAxis(this.#inputAxis);
        this.rigidbody?.velocity.set({ x: 0, y: input.value.y * PADDLE_SPEED });
    }

    reset() {
        this.setPosition({ x: this.position.x, y: 0 });
    }
}

class PongScene extends Scene {
    #ball!: E_Shape;
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
            bounce: 1
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
            type: 'shape',
            name: 'Ball',
            shape: 'ELLIPSE',
            scale: { x: 20, y: 20 },
            style: { fillStyle: 'white' },
            collision: true,
            bounce: 1
        }) as E_Shape;
        this.ballReset();
    }

    override update() {
        const canvasSize = this.engine.canvasSize;
        if (canvasSize) {
            if (this.#ball.position.x < -canvasSize.x / 2) {
                this.score('player2');
            }
            else if (this.#ball.position.x > canvasSize.x / 2) {
                this.score('player1');
            }
        }

        this.#scoreText.text = `${this.#score1}-${this.#score2}`;
    }

    score(winner: 'player1' | 'player2') {
        if (winner === 'player1') {
            this.#score1++;
        } else {
            this.#score2++;
        }

        this.ballReset();
    }

    ballReset() {
        this.#ball.setPosition(0);
        const side = this.engine.random() > 0.5 ? 0 : 180;
        const angleDeg = side + (this.engine.random() * 90 - 45);
        const angleRad = (angleDeg * Math.PI) / 180;
        if (this.#ball.rigidbody) {
            this.#ball.rigidbody.velocity.set(Vector.fromAngle(angleRad).scaleBy(BALL_STARTING_SPEED));
        }
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
        gravityScale: 0
    };

    harness.engine.openScene(PongScene);

    await harness.step(100);
    harness.snapshot();
    await harness.step(2);
    harness.snapshot();
};
