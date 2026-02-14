import { type IVector, type TwoAxisAlignment } from '@repo/engine';
import { type Entity } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import { type EngineScenario } from '../types';

const NUM_BOXES = 180;
const NUM_ORBITERS = 56;
const NUM_STAR_LINES = 40;
const ELLIPSE_RING_COUNT = 36;
const ELLIPSE_RING_2_COUNT = 24;
const NUM_FIGURE_EIGHTS = 32;
const NUM_EDGE_TOWERS = 4;

class ChaosScene extends Scene {
    #rotatingBox: Entity | null = null;
    #cornerRoots: Entity[] = [];
    #orbitEntities: Entity[] = [];
    #orbit2Entities: Entity[] = [];
    #figureEightEntities: Entity[] = [];
    #ellipseRingEntities: Entity[] = [];
    #pulseRoots: Entity[] = [];
    #edgeTowerRoots: Entity[] = [];
    #nestedBoxEntities: Entity[] = [];
    #time = 0;

    override create() {
        this.#rotatingBox = this.#generateNestedBoxes(NUM_BOXES, [
            { x: 0, y: 0 },
            { x: 0.1, y: -0.1 },
            { x: -0.05, y: 0.05 },
            { x: 0.08, y: 0.08 },
            { x: -0.12, y: -0.06 },
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

        const cornerOffsets = [
            { x: -400, y: -400 },
            { x: 400, y: -400 },
            { x: -400, y: 400 },
            { x: 400, y: 400 },
        ];
        const cornerPatterns: IVector<number>[][] = [
            [
                { x: 0.25, y: 0.25 },
                { x: -0.1, y: 0.1 },
            ],
            [
                { x: -0.25, y: 0.25 },
                { x: 0.15, y: -0.15 },
            ],
            [
                { x: 0.25, y: -0.25 },
                { x: -0.2, y: -0.2 },
            ],
            [
                { x: -0.25, y: -0.25 },
                { x: 0.1, y: 0.2 },
            ],
        ];
        const cornerScales = [300, 280, 320, 290];
        for (let c = 0; c < 4; c++) {
            const root = this.#generateNestedBoxes(NUM_BOXES, cornerPatterns[c])
                .setPosition(cornerOffsets[c])
                .setScale({ x: cornerScales[c], y: cornerScales[c] });
            this.#cornerRoots.push(root);
        }

        this.#pulseRoots.push(
            this.#generateNestedBoxes(40, [{ x: 0.2, y: -0.2 }])
                .setPosition({ x: -250, y: 0 })
                .setScale({ x: 180, y: 180 }),
            this.#generateNestedBoxes(40, [{ x: -0.2, y: 0.2 }])
                .setPosition({ x: 250, y: 0 })
                .setScale({ x: 180, y: 180 }),
            this.#generateNestedBoxes(35, [{ x: -0.15, y: -0.15 }])
                .setPosition({ x: 0, y: -280 })
                .setScale({ x: 160, y: 160 }),
            this.#generateNestedBoxes(35, [{ x: 0.18, y: 0.18 }])
                .setPosition({ x: 0, y: 280 })
                .setScale({ x: 160, y: 160 }),
        );

        const edgeOffsets = [
            { x: -450, y: 0 },
            { x: 450, y: 0 },
            { x: 0, y: -450 },
            { x: 0, y: 450 },
        ];
        const edgePatterns: IVector<number>[][] = [
            [
                { x: 0.15, y: -0.2 },
                { x: -0.2, y: 0.15 },
            ],
            [
                { x: -0.15, y: 0.2 },
                { x: 0.2, y: -0.15 },
            ],
            [
                { x: -0.2, y: -0.15 },
                { x: 0.15, y: 0.2 },
            ],
            [
                { x: 0.2, y: 0.15 },
                { x: -0.15, y: -0.2 },
            ],
        ];
        for (let e = 0; e < NUM_EDGE_TOWERS; e++) {
            const root = this.#generateNestedBoxes(60, edgePatterns[e])
                .setPosition(edgeOffsets[e])
                .setScale({ x: 220, y: 220 });
            this.#edgeTowerRoots.push(root);
        }

        this.#addEllipseRing();
        this.#addEllipseRing2();
        this.#addStarBurst();
        this.#addStarBurstOffset();
        this.#addOrbiters();
        this.#addOrbiters2();
        this.#addFigureEights();
        this.#loadTextAlignmentTest();

        this._engine.setCameraRotation(125);
    }

    override update(deltaTime: number): boolean | void {
        this.#time += deltaTime;
        const t = this.#time;

        this.#rotatingBox?.rotate(150 * deltaTime);

        const cornerSpeeds = [60, -80, 100, -120];
        for (let i = 0; i < this.#cornerRoots.length; i++) {
            this.#cornerRoots[i].rotate(cornerSpeeds[i] * deltaTime);
        }

        const edgeSpeeds = [-95, 110, -75, 88];
        for (let i = 0; i < this.#edgeTowerRoots.length; i++) {
            this.#edgeTowerRoots[i].rotate(edgeSpeeds[i] * deltaTime);
        }

        const pulsePhases = [0, 0.5, 0.33, 0.66];
        const pulseScales = [180, 180, 160, 160];
        for (let i = 0; i < this.#pulseRoots.length; i++) {
            const pulse =
                1 + 0.25 * Math.sin(t * 4 + pulsePhases[i] * Math.PI * 2);
            const s = pulseScales[i] * pulse;
            this.#pulseRoots[i].setScale({ x: s, y: s });
            this.#pulseRoots[i].rotate(55 * deltaTime * (i % 2 === 0 ? 1 : -1));
        }

        for (let i = 0; i < this.#ellipseRingEntities.length; i++) {
            this.#ellipseRingEntities[i].rotate(
                40 * deltaTime * (i % 2 === 0 ? 1 : -1),
            );
        }

        const orbitRadius = 220;
        for (let i = 0; i < this.#orbitEntities.length; i++) {
            const phase =
                (i / this.#orbitEntities.length) * Math.PI * 2 + t * 3;
            const x = Math.cos(phase) * orbitRadius + (i % 3 === 0 ? 50 : 0);
            const y = Math.sin(phase * 1.3) * orbitRadius;
            this.#orbitEntities[i].setPosition({ x, y });
            this.#orbitEntities[i].rotate(
                180 * deltaTime * (i % 2 === 0 ? 1 : -1),
            );
        }

        const orbit2Radius = 140;
        for (let i = 0; i < this.#orbit2Entities.length; i++) {
            const phase =
                (i / this.#orbit2Entities.length) * Math.PI * 2 - t * 4;
            const x = Math.cos(phase) * orbit2Radius;
            const y = Math.sin(phase) * orbit2Radius;
            this.#orbit2Entities[i].setPosition({ x, y });
            this.#orbit2Entities[i].rotate(
                -200 * deltaTime * (i % 2 === 0 ? 1 : -1),
            );
        }

        const figureEightA = 280;
        const figureEightB = 120;
        for (let i = 0; i < this.#figureEightEntities.length; i++) {
            const phase =
                (i / this.#figureEightEntities.length) * Math.PI * 2 + t * 2.5;
            const x = figureEightA * Math.cos(phase);
            const y = figureEightB * Math.sin(phase * 2);
            this.#figureEightEntities[i].setPosition({ x, y });
            this.#figureEightEntities[i].rotate(90 * deltaTime);
        }

        for (let i = 0; i < this.#nestedBoxEntities.length; i++) {
            const speed = ((i % 11) - 5) * 25 * (i % 2 === 0 ? 1 : -1);
            this.#nestedBoxEntities[i].rotate(speed * deltaTime);
        }

        this._engine.rotateAllCameras(-25 * deltaTime);
        const zoomWobble = 0.35 * Math.sin(t * 2) + 0.15 * Math.sin(t * 5);
        this._engine.setAllCamerasZooms(zoomWobble);

        return true;
    }

    #addEllipseRing() {
        const radius = 350;
        for (let i = 0; i < ELLIPSE_RING_COUNT; i++) {
            const angle = (i / ELLIPSE_RING_COUNT) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const e = this.createEntity({
                name: `ellipse_${i}`,
                position: { x, y },
                scale: 20 + (i % 5) * 8,
                zIndex: (i % 3) - 1,
            });
            e.addComponents({
                type: 'circle',
                color: `hsla(${(i * 37) % 360}, 80%, 60%, 0.9)`,
                lineWidth: 2,
            });
            this.#ellipseRingEntities.push(e);
        }
    }

    #addEllipseRing2() {
        const radius = 520;
        for (let i = 0; i < ELLIPSE_RING_2_COUNT; i++) {
            const angle =
                (i / ELLIPSE_RING_2_COUNT) * Math.PI * 2 + Math.PI / 24;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const e = this.createEntity({
                name: `ellipse2_${i}`,
                position: { x, y },
                scale: 12 + (i % 4) * 6,
                zIndex: -3,
            });
            e.addComponents({
                type: 'circle',
                color: `hsla(${(i * 53 + 180) % 360}, 70%, 55%, 0.85)`,
                lineWidth: 1,
            });
        }
    }

    #addStarBurst() {
        const cx = 0;
        const cy = 0;
        const length = 6000;
        for (let i = 0; i < NUM_STAR_LINES; i++) {
            const angle = (i / NUM_STAR_LINES) * Math.PI * 2;
            const start = { x: cx, y: cy };
            const end = {
                x: cx + Math.cos(angle) * length,
                y: cy + Math.sin(angle) * length,
            };
            const lineEntity = this.createEntity({
                name: `star_${i}`,
                position: { x: 0, y: 0 },
                zIndex: -2,
            });
            lineEntity.addComponents({
                type: 'line',
                start,
                end,
                lineColor: `hsl(${(i * 25) % 360}, 70%, 50%)`,
                lineWidth: 3,
            });
        }
    }

    #addStarBurstOffset() {
        const length = 320;
        for (let i = 0; i < NUM_STAR_LINES; i++) {
            const angle =
                (i / NUM_STAR_LINES) * Math.PI * 2 + Math.PI / NUM_STAR_LINES;
            const start = { x: 0, y: 0 };
            const end = {
                x: Math.cos(angle) * length,
                y: Math.sin(angle) * length,
            };
            const lineEntity = this.createEntity({
                name: `star2_${i}`,
                position: { x: 0, y: 0 },
                zIndex: -1,
            });
            lineEntity.addComponents({
                type: 'line',
                start,
                end,
                lineColor: `hsla(${(i * 15 + 200) % 360}, 60%, 55%, 0.8)`,
                lineWidth: 2,
            });
        }
    }

    #addOrbiters() {
        for (let i = 0; i < NUM_ORBITERS; i++) {
            const e = this.createEntity({
                name: `orbiter_${i}`,
                position: { x: 0, y: 0 },
                scale: 12 + (i % 5) * 4,
            });
            e.addComponents({
                type: i % 3 === 0 ? 'circle' : 'rectangle',
                color: `hsl(${(i * 60) % 360}, 90%, 55%)`,
                lineWidth: 1,
            });
            this.#orbitEntities.push(e);
        }
    }

    #addOrbiters2() {
        const n = 28;
        for (let i = 0; i < n; i++) {
            const e = this.createEntity({
                name: `orbiter2_${i}`,
                position: { x: 0, y: 0 },
                scale: 8 + (i % 3) * 4,
            });
            e.addComponents({
                type: i % 2 === 0 ? 'circle' : 'rectangle',
                color: `hsl(${(i * 40 + 30) % 360}, 85%, 60%)`,
                lineWidth: 1,
            });
            this.#orbit2Entities.push(e);
        }
    }

    #addFigureEights() {
        for (let i = 0; i < NUM_FIGURE_EIGHTS; i++) {
            const e = this.createEntity({
                name: `figure8_${i}`,
                position: { x: 0, y: 0 },
                scale: 10 + (i % 4) * 3,
            });
            e.addComponents({
                type: i % 4 === 0 ? 'circle' : 'rectangle',
                color: `hsl(${(i * 20) % 360}, 95%, 50%)`,
                lineWidth: 1,
            });
            this.#figureEightEntities.push(e);
        }
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
                type: 'rectangle',
                color: `hsl(${(i * 40) % 360}, 70%, 50%)`,
                lineWidth: 0.1,
            });
            this.#nestedBoxEntities.push(entity);
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

            const textEntity = this.createEntity({
                name: `textAlign_${textAlignments[i]}`,
                position: { x, y },
            });
            textEntity.addComponents({
                type: 'text',
                text: `${debugText}\n(${textAlignments[i]})`,
                fontSize: 14,
                textAlign: textAlignments[i],
                color: 'white',
            });
        }
    }
}

export const renderChaos: EngineScenario = async (harness) => {
    harness.engine.options = {
        cameraOptions: {
            scrollMode: 'none',
            resetAfterNClicks: 0,
        },
    };
    harness.engine.openScene(ChaosScene);
};
