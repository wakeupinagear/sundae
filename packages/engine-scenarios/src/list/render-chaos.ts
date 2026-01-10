import { IVector, type TwoAxisAlignment } from '@repo/engine';
import { EngineScenario } from '@repo/engine-scenarios';
import { Entity } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

const NUM_BOXES = 50;

class ChaosScene extends Scene {
    #rotatingBox: Entity | null = null;

    override create() {
        this.#rotatingBox = this.#generateNestedBoxes(NUM_BOXES, [
            { x: 0, y: 0 },
        ])
            .setScale({ x: 200, y: 200 })
            .rotate(45);
        this.#rotatingBox.addChildren(
            {
                name: 'Top Left',
                scale: 0.25,
                position: { x: -0.5, y: -0.5 },
                components: [],
            },
            {
                name: 'Top Right',
                scale: 0.25,
                position: { x: 0.5, y: -0.5 },
                components: [],
            },
            {
                name: 'Bottom Left',
                scale: 0.25,
                position: { x: -0.5, y: 0.5 },
                components: [],
            },
            {
                name: 'Bottom Right',
                scale: 0.25,
                position: 0.5,
                components: [],
            },
            {
                name: 'Center Behind',
                scale: 1.25,
                zIndex: -1,
                components: [],
            },
            {
                name: 'Center Above',
                scale: 0.02,
                components: [],
            },
        );

        this.#generateNestedBoxes(NUM_BOXES, [{ x: 0.25, y: 0.25 }])
            .setPosition({
                x: -400,
                y: -400,
            })
            .setScale({ x: 300, y: 300 });
        this.#generateNestedBoxes(NUM_BOXES, [{ x: -0.25, y: 0.25 }])
            .setPosition({
                x: 400,
                y: -400,
            })
            .setScale({ x: 300, y: 300 });
        this.#generateNestedBoxes(NUM_BOXES, [{ x: 0.25, y: -0.25 }])
            .setPosition({
                x: -400,
                y: 400,
            })
            .setScale({ x: 300, y: 300 });
        this.#generateNestedBoxes(NUM_BOXES, [{ x: -0.25, y: -0.25 }])
            .setPosition({
                x: 400,
                y: 400,
            })
            .setScale({ x: 300, y: 300 });

        this.#loadTextAlignmentTest();
    }

    override update(deltaTime: number): boolean {
        this.#rotatingBox?.rotate(90 * deltaTime);

        this._engine.setCameraRotation(
            this._engine.camera.rotation - 10 * deltaTime,
        );

        return true;
    }

    #generateNestedBoxes(count: number, pattern: IVector<number>[]): Entity {
        let currEntity: Entity | null = null;
        let root: Entity | null = null;
        for (let i = 0; i < count; i++) {
            const frame = pattern[i % pattern.length];
            const entityOptions = {
                name: `Nested Box Level ${i + 1}`,
                scene: this.name,
                position: frame,
                scale: 0.75,
                rotation: 12 * (i % 2 === 0 ? 1 : -1),
            };
            const entity: Entity = currEntity
                ? currEntity.addChildren(entityOptions)[0]
                : this._engine.createEntities(entityOptions)[0];
            entity.addComponents({
                name: `Box Level ${i + 1}`,
                type: 'shape',
                shape: 'RECT',
                style: {
                    fillStyle: `hsl(${(i * 40) % 360}, 70%, 50%)`,
                    lineWidth: 0.1,
                },
            });
            if (!currEntity) {
                root = entity;
            }

            currEntity = entity;
        }

        return root!;
    }

    #loadTextAlignmentTest() {
        const textAlignments: TwoAxisAlignment[] = [
            'top-left',
            'top-center',
            'top-right',
            'left',
            'center',
            'right',
            'bottom-left',
            'bottom-center',
            'bottom-right',
        ];

        const debugText = 'Alignment\nTest';
        const gridSize = 3;
        const cellWidth = 200;
        const cellHeight = 200;
        const startX = -300;
        const startY = -300;

        for (let i = 0; i < textAlignments.length; i++) {
            const col = i % gridSize;
            const row = Math.floor(i / gridSize);
            const x = startX + col * cellWidth + cellWidth / 2;
            const y = startY + row * cellHeight + cellHeight / 2;

            const textEntity = this.createEntities({
                name: `textAlign_${textAlignments[i]}`,
                zIndex: 1000,
            })[0];
            textEntity.transform.position.set({ x, y });

            textEntity.addComponents({
                type: 'shape',
                shape: 'ELLIPSE',
                style: {
                    fillStyle: 'blue',
                },
                size: 10,
            });

            textEntity.addComponents({
                type: 'text',
                text: `${debugText}\n(${textAlignments[i]})`,
                fontSize: 14,
                textAlign: textAlignments[i],
                style: {
                    fillStyle: 'white',
                },
            });
        }
    }
}

export const renderChaos: EngineScenario = async (harness) => {
    harness.engine.openScene(ChaosScene);
};
