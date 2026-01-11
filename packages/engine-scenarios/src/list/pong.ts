import { Vector } from '@repo/engine';
import { EngineScenario } from '@repo/engine-scenarios';
import { E_Text, Entity, EntityOptions } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

const PLAYER_1_INPUT_AXIS = 'player1';
const PLAYER_2_INPUT_AXIS = 'player2';

interface E_PaddleOptions extends EntityOptions {
    inputAxis: string;
}

class E_Paddle extends Entity {
    #inputAxis: string;
    #speed: number = 1000;

    constructor(options: E_PaddleOptions) {
        super(options);
        this.addComponent({
            type: 'shape',
            shape: 'RECT',
            style: {
                fillStyle: 'white',
            },
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
        this.position.set({ x: 0, y: this.position.y });
    }
}

interface E_BallOptions extends EntityOptions {
    colliders: Entity[];
}

class E_Ball extends Entity {
    #colliders: Entity[] = [];
    #direction: Vector = new Vector(0, 0);
    #speed: number = 1000;

    constructor(options: E_BallOptions) {
        super(options);
        this.#colliders = options.colliders;
        this.addComponent({
            type: 'shape',
            shape: 'ELLIPSE',
            style: {
                fillStyle: 'white',
            },
        });

        this.reset();
    }

    override update() {
        this.position.addMut({ x: 1, y: 1 });
    }

    reset() {
        this.position.set({ x: 0, y: 0 });
        this.#direction.set(Vector.fromAngle(Math.random() * 360));
    }
}

class PongScene extends Scene {
    #paddle1!: E_Paddle;
    #paddle2!: E_Paddle;
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

        this.#paddle1 = this.createEntity({
            type: E_Paddle,
            inputAxis: PLAYER_1_INPUT_AXIS,
            name: 'Paddle 1',
            position: { x: -350, y: 0 },
            scale: { x: 20, y: 150 },
        });

        this.#paddle2 = this.createEntity({
            type: E_Paddle,
            inputAxis: PLAYER_2_INPUT_AXIS,
            name: 'Paddle 2',
            position: { x: 350, y: 0 },
            scale: { x: 20, y: 150 },
        });

        this.#ball = this.createEntity({
            type: E_Ball,
            colliders: [this.#paddle1, this.#paddle2],
            name: 'Ball',
            scale: { x: 20, y: 20 },
        });

        const wallOptions: EntityOptions = {
            scale: { x: 1000, y: 100 },
            components: [
                {
                    type: 'shape',
                    shape: 'RECT',
                    style: {
                        fillStyle: '#BBBBBB',
                    },
                },
            ],
        };
        this.createEntities(
            {
                name: 'Top Wall',
                position: { x: 0, y: -300 },
                ...wallOptions,
            },
            {
                name: 'Bottom Wall',
                position: { x: 0, y: 300 },
                ...wallOptions,
            },
        );
    }

    override update() {
        this.#scoreText.text = `${this.#score1}-${this.#score2}`;
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
