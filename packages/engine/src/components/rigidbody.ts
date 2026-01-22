import { type Engine } from '../engine';
import { Vector, type VectorConstructor } from '../math/vector';
import type { CollisionContact } from '../types';
import { Component, type ComponentOptions } from './index';

interface C_RigidbodyOptions extends ComponentOptions {
    mass?: number;
    kinematic?: boolean;
    velocity?: VectorConstructor;
    force?: VectorConstructor;
    gravityScale?: VectorConstructor;
    bounce?: number;
}

export interface C_RigidbodyJSON extends C_RigidbodyOptions {
    type: 'rigidbody';
}

export class C_Rigidbody<
    TEngine extends Engine = Engine,
> extends Component<TEngine> {
    #mass: number;
    #kinematic: boolean;
    #velocity: Vector;
    #force: Vector;
    #gravityScale: Vector;
    #bounce: number;

    #acceleration: Vector = new Vector(0);
    #invMass: number = 1;

    constructor(options: C_RigidbodyOptions) {
        super(options);

        this.#mass = options.mass ?? 1;
        this.#kinematic = options.kinematic ?? false;
        this.#velocity = new Vector(options.velocity ?? 0);
        this.#force = new Vector(options.force ?? 0);
        this.#gravityScale = new Vector(options.gravityScale ?? 1);
        this.#bounce = options.bounce ?? 0.2;
        this.#computeInvMass();

        this._engine.physicsSystem.registerPhysicsEntity(this.entity);
    }

    override destroy(): void {
        super.destroy();

        this._engine.physicsSystem.unregisterPhysicsEntity(this.entity);
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

    get velocity(): Readonly<Vector> {
        return this.#velocity;
    }

    set velocity(value: VectorConstructor) {
        this.#velocity.set(value);
    }

    get bounce(): number {
        return this.#bounce;
    }

    set bounce(value: number) {
        this.#bounce = Math.max(0, Math.min(1, value));
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    override onCollision(_contact: CollisionContact<TEngine>): void {
    }

    addImpulse(impulse: VectorConstructor): void {
        if (this.#invMass > 0) {
            this.#velocity.addMut(new Vector(impulse).scaleBy(this.#invMass));
        }
    }

    addForce(force: VectorConstructor): void {
        this.#force.addMut(force);
    }

    physicsUpdate(deltaTime: number, currentGravity: Vector): void {
        this.addForce(currentGravity.scaleBy(this.#mass).scaleBy(this.#gravityScale));

        this.#acceleration.set(this.#force.scaleBy(this.#invMass));
        this.#velocity.addMut(this.#acceleration.scaleBy(deltaTime));
        this._entity.move(this.#velocity.scaleBy(deltaTime));
        this.#force.set(0);
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
