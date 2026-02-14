import type { Engine } from '../engine';

export abstract class System<TEngine extends Engine = Engine> {
    public static typeString: string = 'System';

    protected _engine: TEngine;

    constructor(engine: TEngine) {
        this._engine = engine;
        this._engine.addSystem(this);
    }

    get typeString(): string {
        return System.typeString;
    }

    get engine(): TEngine {
        return this._engine;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    earlyUpdate(_deltaTime: number): boolean | void {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    lateUpdate(_deltaTime: number): boolean | void {}

    destroy(): void {
        this._engine.removeSystem(this);
    }
}
