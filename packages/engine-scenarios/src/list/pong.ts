import { Vector } from '@repo/engine';
import {
    type E_Circle,
    E_Rectangle,
    type E_RectangleOptions,
    type E_Text,
    type EntityOptions,
} from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import { type EngineScenario } from '../types';

const PLAYER_1_INPUT_AXIS = 'player1';
const PLAYER_2_INPUT_AXIS = 'player2';

const BALL_STARTING_SPEED = 500;
const PADDLE_SPEED = 1000;

interface E_PaddleOptions extends EntityOptions {
    inputAxis: string;
}

class E_Paddle extends E_Rectangle {
    #inputAxis: string;

    constructor(options: E_PaddleOptions) {
        super({
            ...options,
            color: 'white',
            collision: 'solid',
            mass: 1e6,
            bounce: 1,
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
    #ball!: E_Circle;
    #paddle1!: E_Paddle;
    #paddle2!: E_Paddle;
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
            color: '#333333',
            zIndex: -1,
        }) as E_Text;

        [this.#paddle1, this.#paddle2] = this.createEntities(
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

        const wallOptions: E_RectangleOptions = {
            scale: { x: 1000, y: 100 },
            color: '#BBBBBB',
            collision: 'solid',
            kinematic: true,
            bounce: 1,
        };

        this.createEntities(
            {
                type: 'rectangle',
                name: 'Top Wall',
                position: { x: 0, y: -300 },
                ...wallOptions,
            },
            {
                type: 'rectangle',
                name: 'Bottom Wall',
                position: { x: 0, y: 300 },
                ...wallOptions,
            },
        );

        this.#ball = this.createEntity({
            type: 'circle',
            name: 'Ball',
            color: 'white',
            scale: { x: 20, y: 20 },
            collision: 'solid',
            bounce: 1,
        }) as E_Circle;
        this.ballReset();
    }

    override update() {
        if (this.#ball.position.x < this.#paddle1.position.x - 36) {
            this.score('player2');
        } else if (this.#ball.position.x > this.#paddle2.position.x + 36) {
            this.score('player1');
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
            this.#ball.rigidbody.velocity.set(
                Vector.fromAngle(angleRad).scaleBy(BALL_STARTING_SPEED),
            );
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
        gravityScale: 0,
    };

    harness.engine.openScene(PongScene);

    await harness.step(100);
    await harness.snapshot();
    await harness.step(2);
    await harness.snapshot();
};
