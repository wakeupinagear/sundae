import { System } from '.';

export class PhysicsSystem extends System {
    lateUpdate(): boolean | void {
        this.#broadPhase();
        this.#narrowPhase();
    }

    #broadPhase() {}

    #narrowPhase() {}
}
