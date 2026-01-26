import { Scene } from '@repo/engine/scene';

import type { EngineScenario } from '../types';

const TILE_SIZE = 32;
const DOT_SIZE = 6;

class InfiniteCanvasScene extends Scene {
    override create() {
        this.createEntities(
            {
                name: 'origin',
                type: 'shape',
                shape: 'ELLIPSE',
                style: { fillStyle: 'red' },
                scale: DOT_SIZE * 2,
            },
            {
                name: 'dots',
                type: 'infinite_shape',
                shape: 'ELLIPSE',
                opacity: 0.5,
                style: { fillStyle: '#BBBBBB' },
                tileSize: TILE_SIZE,
                scale: DOT_SIZE,
                offset: TILE_SIZE * 0.5,
            },
            {
                type: 'infinite_shape',
                name: 'x-axis',
                shape: 'ELLIPSE',
                style: { strokeStyle: 'green', lineWidth: 2 },
                tileSize: TILE_SIZE,
                infiniteAxes: { x: true, y: false },
                offset: TILE_SIZE * 0.5,
            },
            {
                type: 'infinite_shape',
                name: 'y-axis',
                shape: 'ELLIPSE',
                style: { strokeStyle: 'blue', lineWidth: 2 },
                tileSize: TILE_SIZE,
                infiniteAxes: { x: false, y: true },
                offset: TILE_SIZE * 0.5,
            },
        );
    }
}

export const infiniteCanvas: EngineScenario = async (harness) => {
    harness.engine.options = {
        cameraOptions: {
            canDrag: true,
            scrollMode: 'all',
            bounds: {
                x1: -Infinity,
                x2: Infinity,
                y1: -Infinity,
                y2: Infinity,
            },
        },
    };
    harness.engine.openScene(InfiniteCanvasScene);
};
