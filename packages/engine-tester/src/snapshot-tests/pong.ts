import { Scene } from '@repo/engine/scene';

import { SnapshotTest } from '../test-utils/snapshot';

class PongScene extends Scene {
    override update() {
        console.log('PongScene update');
        return false;
    }
}

export const pong: SnapshotTest = ({ engine }) => {
    engine.openScene(PongScene);
};
