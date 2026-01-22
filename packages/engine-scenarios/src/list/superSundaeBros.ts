import { type CollisionContact, type Engine, type EngineOptions, type IVector, Vector } from '@repo/engine';
import { E_Shape, type E_ShapeOptions, type E_Text } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import { type EngineScenario } from '..';

type Tile = 'P' | 'C' | 'B' | 'Y' | 'A' | 'F' | 'G' | 'H' | 'I';

const TILE_SIZE = 32;
const TOP_LEFT_CORNER: IVector<number> = { x: -400, y: -260 };

const TILE_METADATA: Record<
    Tile,
    {
        name: string;
        color: string;
        borderColor: string;
    }
> = {
    P: { name: 'Player', color: 'white', borderColor: 'black' },
    C: { name: 'Question Block', color: 'yellow', borderColor: 'black' },
    B: { name: 'Block', color: 'white', borderColor: 'black' },
    Y: { name: 'Goomba', color: '#684632', borderColor: 'white' },
    A: { name: 'Ground', color: '#954b0c', borderColor: 'black' },
    F: { name: 'Pipe Top Left', color: '#138200', borderColor: 'black' },
    G: { name: 'Pipe Top Right', color: '#138200', borderColor: 'black' },
    H: { name: 'Pipe Left', color: '#138200', borderColor: 'black' },
    I: { name: 'Pipe Right', color: '#138200', borderColor: 'black' },
};

const PLAYER_MOVEMENT_AXIS = 'move';
const PLAYER_JUMP_INPUT = 'jump';

const LEVEL_1 = `
....................................................................................................................................................................................................................
....................................................................................................................................................................................................................
....................................................................................Y..Y............................................................................................................................
....................................................................................................................................................................................................................
......................C.........................................................BBBBBBBB...BBBC..............C...........BBB....BCCB........................................................DD......................
...........................................................................................................................................................................................DDD......................
................................................................................................................Y.........................................................................DDDD......................
.........................................................................................................................................................................................DDDDD......................
...P............C...BCBCB.....................FG.........FG..................BCB..............B.....BB....C..C..C.....B..........BB......D..D..........DD..D............BBCB............DDDDDD......................
......................................FG......HI.........HI.............................................................................DD..DD........DDD..DD..........................DDDDDDD......................
........................Y...FG........HI....Y.HI...Y..Y..HI............................................Y..Y................Y.Y.........DDD..DDD......DDDD..DDD.....FG.......Y.Y....FG.DDDDDDDD......................
............................HI........HI......HI.........HI...........................................................................DDDD..DDDD....DDDDD..DDDD....HI..............HIDDDDDDDDD........D.............
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAA...AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAA...AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAA...AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAA...AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAA...AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAA...AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAA...AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA..AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
`;

interface E_PlayerOptions extends E_ShapeOptions {
    levelScene: LevelScene;
}

class E_Player extends E_Shape {
    #levelScene!: LevelScene;

    constructor(options: E_PlayerOptions) {
        super({
            ...options,
            mass: 5,
            components: [{ type: 'rectangleCollider' }],
        });

        this.#levelScene = options.levelScene;
    }

    update(): boolean | void {
        const input = this.engine.getAxis(PLAYER_MOVEMENT_AXIS);
        this.rigidbody?.addForce({ x: input.value.x * 10000, y: 0 });

        const raycastResult = this.engine.raycast({
            origin: { x: this.position.x + this.scale.x * 0.5, y: this.position.y + this.scale.y * 0.5 },
            direction: Vector.DOWN,
            maxDistance: 25,
            ignoreEntity: this,
        });
        if (this.engine.getButton(PLAYER_JUMP_INPUT).pressed && raycastResult) {
            this.jump();
        }
    }

    onCollision(contact: CollisionContact<Engine<EngineOptions>>): void {
        if (contact.other.entity.name === 'Question Block' && contact.contactNormal.dot(Vector.UP) < 0) {
            contact.other.entity.destroy();
            this.#levelScene.addScore(100);
        } else if (contact.other.entity.name === 'Goomba') {
            if (contact.other.entity.position.y - this.position.y > 10) {
                contact.other.entity.destroy();
                this.#levelScene.addScore(50);

                const jumpButton = this.engine.getButton(PLAYER_JUMP_INPUT);
                if (jumpButton.down && jumpButton.downTime < 0.5) {
                    this.jump();
                } else {
                    this.bounce();
                }
            } else {
                this.destroy();
            }
        }
    }

    jump(): void {
        this.rigidbody?.addForce({ x: 0, y: -250000 });
    }

    bounce(): void {
        this.rigidbody?.addForce({ x: 0, y: -100000 });
    }
}

class E_Goomba extends E_Shape {
    constructor(options: E_ShapeOptions) {
        super({
            ...options,
            mass: 1e6,
            components: [{ type: 'rectangleCollider' }],
        });
    }
}

class LevelScene extends Scene {
    #player!: E_Player;
    #uiText!: E_Text;

    #score = 0;

    create() {
        const tiles = LEVEL_1.split('\n').map((row) => row.split(''));
        for (let y = 0; y < tiles.length; y++) {
            for (let x = 0; x < tiles[y].length; x++) {
                const tile = tiles[y][x];
                if (tile in TILE_METADATA) {
                    const { name, color } = TILE_METADATA[tile as Tile];
                    const properties = {
                        name,
                        shape: 'RECT',
                        style: { fillStyle: color },
                        position: {
                            x: TOP_LEFT_CORNER.x + x * TILE_SIZE,
                            y: TOP_LEFT_CORNER.y + y * TILE_SIZE,
                        },
                        scale: TILE_SIZE,
                        origin: { x: 0, y: 0 },
                    };

                    switch (tile) {
                        case 'P':
                            this.#player = this.createEntity({
                                ...properties,
                                type: E_Player,
                                shape: 'ELLIPSE',
                                levelScene: this,
                            }) as E_Player;
                            break;
                        case 'Y':
                            this.createEntity({
                                ...properties,
                                type: E_Goomba,
                                shape: 'ELLIPSE',
                            }) as E_Goomba;
                            break;
                        default:
                            this.createEntity({
                                ...properties,
                                type: 'shape',
                                shape: 'RECT',
                                collision: true,
                            });
                            break;
                    }
                }
            }
        }

        this.#uiText = this.createEntity({
            type: 'text',
            name: 'Score Text',
            fontSize: 24,
            textAlign: 'bottom-left',
            padding: 24,
            bold: true,
            positionRelativeToCamera: { x: 'end', y: 'start' }
        }) as E_Text;
        this.#computeScoreText();
    }

    update(): boolean | void {
        this.engine.cameraTarget = ({
            position: {
                x: Math.max(
                    this.engine.camera.position.x,
                    this.#player.position.x,
                ),
                y: this.engine.camera.position.y,
            },
            zoom: this.engine.camera.zoom,
            rotation: this.engine.camera.rotation,
        });
    }
    
    addScore(score: number): void {
        this.#score += score;
        this.#computeScoreText();
    }

    #computeScoreText(): void {
        this.#uiText.text = `Score: ${this.#score}`;
    }
}

export const superSundaeBros: EngineScenario = async (harness) => {
    harness.engine.options = {
        inputConfigs: {
            [PLAYER_JUMP_INPUT]: {
                type: 'button',
                inputs: [' '],
            },
            [PLAYER_MOVEMENT_AXIS]: {
                type: 'axis',
                left: ['ArrowLeft', 'a'],
                right: ['ArrowRight', 'd'],
                up: ['ArrowUp', 'w'],
                down: ['ArrowDown', 's'],
            },
        },
        clearColor: '#6185f8',
        gravityScale: 2000,
    };
    harness.engine.openScene(LevelScene);
};
