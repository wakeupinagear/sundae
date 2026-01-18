import { IVector } from '@repo/engine';
import { E_Shape, E_ShapeOptions } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import { EngineScenario } from '..';

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
    C: { name: 'Question Block', color: 'white', borderColor: 'black' },
    B: { name: 'Block', color: 'white', borderColor: 'black' },
    Y: { name: 'Goomba', color: 'tan', borderColor: 'black' },
    A: { name: 'Ground', color: 'brown', borderColor: 'black' },
    F: { name: 'Pipe Top Left', color: 'green', borderColor: 'black' },
    G: { name: 'Pipe Top Right', color: 'green', borderColor: 'black' },
    H: { name: 'Pipe Left', color: 'forestgreen', borderColor: 'black' },
    I: { name: 'Pipe Right', color: 'forestgreen', borderColor: 'black' },
};

const PLAYER_MOVEMENT_AXIS = 'move';
const PLAYER_JUMP_INPUT = 'jump';

const LEVEL_1 = `
....................................................................................................................................................................................................................
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

class E_Player extends E_Shape {
    constructor(options: E_ShapeOptions) {
        super({
            ...options,
            mass: 5,
            components: [{ type: 'rectangleCollider' }],
        });
    }

    update(_deltaTime: number): boolean | void {
        const input = this.engine.getAxis(PLAYER_MOVEMENT_AXIS);
        this.rigidbody?.addForce({ x: input.value.x * 10000, y: 0 });

        if (this.engine.getButton(PLAYER_JUMP_INPUT).pressed) {

        
                this.rigidbody?.addForce({ x: 0, y: -250000 });
        }
    }
}

class E_Goomba extends E_Shape {
    constructor(options: E_ShapeOptions) {
        super({
            ...options,
            style: { fillStyle: 'tan' },
            mass: 5,
            components: [{ type: 'rectangleCollider' }],
        });
    }
}

class LevelScene extends Scene {
    #player!: E_Player;

    create() {
        const tiles = LEVEL_1.split('\n').map((row) => row.split(''));
        for (let y = 0; y < tiles.length; y++) {
            for (let x = 0; x < tiles[y].length; x++) {
                const tile = tiles[y][x];
                if (tile in TILE_METADATA) {
                    let lastWallStartX: number | null = null;
                    const { color } = TILE_METADATA[tile as Tile];
                    const properties = {
                        shape: 'RECT',
                        style: { fillStyle: color },
                        position: {
                            x: TOP_LEFT_CORNER.x + x * TILE_SIZE,
                            y: TOP_LEFT_CORNER.y + y * TILE_SIZE,
                        },
                        scale: TILE_SIZE,
                        origin: { x: 0, y: 0 },
                    };

                    if (lastWallStartX !== null && x !== tiles[y].length - 1) {
                        this.createEntity({
                            ...properties,
                            type: 'shape',
                            shape: 'RECT',
                            collision: true,
                            scale: { x: (x - lastWallStartX) * TILE_SIZE, y: TILE_SIZE },
                        });
                    }

                    switch (tile) {
                        case 'P':
                            this.#player = this.createEntity({
                                ...properties,
                                type: E_Player,
                                shape: 'ELLIPSE',
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
    }

    update(): boolean | void {
        this._engine.cameraTarget = ({
            position: {
                x: Math.max(
                    this._engine.camera.position.x,
                    this.#player.position.x,
                ),
                y: this._engine.camera.position.y,
            },
            zoom: this._engine.camera.zoom,
            rotation: this._engine.camera.rotation,
        });
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
        gravityScale: 2000,
    };
    const scene = harness.engine.openScene(LevelScene);
};
