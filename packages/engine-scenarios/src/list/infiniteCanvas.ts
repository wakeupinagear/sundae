import { Scene } from '@repo/engine/scene';

import type { EngineScenario } from '../types';

const TILE_SIZE = 32;
const DOT_SIZE = 6;

class InfiniteCanvasScene extends Scene {
    override create() {
        this.createEntity({
            type: 'infinite_shape',
            name: 'grid',
            shape: 'ELLIPSE',
            opacity: 0.5,
            style: { fillStyle: '#BBBBBB' },
            tileSize: TILE_SIZE,
            zoomCullThresh: 0.2,
            scale: DOT_SIZE,
        });
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
