import { defineSnapshotTest } from '../test-utils/snapshot';
import { pong } from './pong';

defineSnapshotTest('Pong', pong);
