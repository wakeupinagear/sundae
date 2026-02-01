import { PointerButton } from '@repo/engine/pointer';
import { Scene } from '@repo/engine/scene';

import type { EngineScenario } from '../types';

const TILE_SIZE = 32;

const DOT_SIZE = 6;

const GRID_UNIT = 10 * TILE_SIZE;
const GRID_LINE_EXTENT = 100_000;

class InfiniteCanvasScene extends Scene {
    override create() {
        this.createEntities(
            {
                type: 'infinite_shape',
                name: 'grid-y',
                shape: 'LINE',
                start: { x: -GRID_LINE_EXTENT, y: 0 },
                end: { x: GRID_LINE_EXTENT, y: 0 },
                lineColor: '#666666',
                lineWidth: 1,
                tileSize: GRID_UNIT,
                infiniteAxes: { x: false, y: true },
                offset: -GRID_UNIT / 2,
                scale: 1,
                zIndex: -1,
            },
            {
                type: 'infinite_shape',
                name: 'grid-x',
                shape: 'LINE',
                start: { x: 0, y: -GRID_LINE_EXTENT },
                end: { x: 0, y: GRID_LINE_EXTENT },
                lineColor: '#666666',
                lineWidth: 1,
                tileSize: GRID_UNIT,
                infiniteAxes: { x: true, y: false },
                offset: -GRID_UNIT / 2,
                scale: 1,
                zIndex: -1,
            },
            {
                name: 'dots',
                type: 'infinite_shape',
                shape: 'ELLIPSE',
                color: '#333333',
                tileSize: TILE_SIZE,
                scale: DOT_SIZE,
                offset: TILE_SIZE * 0.5,
                zoomCullThresh: 0.2,
            },
            {
                type: 'infinite_shape',
                name: 'x-axis',
                shape: 'ELLIPSE',
                lineColor: 'green',
                lineWidth: 2,
                tileSize: TILE_SIZE,
                infiniteAxes: { x: true, y: false },
                offset: TILE_SIZE * 0.5,
            },
            {
                type: 'infinite_shape',
                name: 'y-axis',
                shape: 'ELLIPSE',
                lineColor: 'blue',
                lineWidth: 2,
                tileSize: TILE_SIZE,
                infiniteAxes: { x: false, y: true },
                offset: TILE_SIZE * 0.5,
            },
            {
                name: 'origin',
                type: 'shape',
                shape: 'ELLIPSE',
                color: 'red',
                scale: DOT_SIZE * 2,
            },
        );
    }
}

export const infiniteCanvas: EngineScenario = async (harness) => {
    harness.engine.options = {
        cameraOptions: {
            clearColor: 'black',
            canDrag: true,
            scrollMode: 'all',
            bounds: {
                x1: -Infinity,
                x2: Infinity,
                y1: -Infinity,
                y2: Infinity,
            },
            dragButtons: [
                PointerButton.LEFT,
                PointerButton.RIGHT,
                PointerButton.MIDDLE,
            ],
        },
    };
    harness.engine.openScene(InfiniteCanvasScene);
};
