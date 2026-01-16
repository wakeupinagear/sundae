import { Engine } from '../exports';
import { Component, ComponentOptions } from './factory';

interface C_RigidbodyOptions extends ComponentOptions {
    mass?: number;
    kinematic?: boolean;
}

export interface C_RigidbodyJSON extends C_RigidbodyOptions {
    type: 'rigidbody';
}

export class C_Rigidbody<
    TEngine extends Engine = Engine,
> extends Component<TEngine> {
    #mass: number;
    #kinematic: boolean;

    #invMass: number = 1;

    constructor(options: C_RigidbodyOptions) {
        super(options);

        this.#mass = options.mass ?? 1;
        this.#kinematic = options.kinematic ?? false;
        this.#computeInvMass();
    }

    get mass(): number {
        return this.#mass;
    }

    set mass(value: number) {
        if (this.#mass !== value) {
            this.#mass = value;
            this.#computeInvMass();
        }
    }

    get invMass(): number {
        return this.#invMass;
    }

    get kinematic(): boolean {
        return this.#kinematic;
    }

    set kinematic(value: boolean) {
        if (this.#kinematic !== value) {
            this.#kinematic = value;
            this.#computeInvMass();
        }
    }

    #computeInvMass() {
        if (this.#kinematic) {
            this.#invMass = 0;
        } else if (this.#mass === 0) {
            this.#invMass = Infinity;
        } else {
            this.#invMass = 1 / this.#mass;
        }
    }
}
