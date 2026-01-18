import { System } from '.';
import { C_Collider } from '../components/colliders';
import { C_Rigidbody } from '../components/rigidbody';
import type { Engine } from '../engine';
import { Entity, Vector, VectorConstructor, boundingBoxesIntersect } from '../exports';
import type { CollisionContact } from '../types';

const INV_MASS_EPSILON = 1e-6;
const MIN_PENETRATION_DEPTH = 0.01;
const MAX_TIMESTEP_ACCUMULATION = 0.25;

const ZERO_VECTOR = new Vector(0);

export class PhysicsSystem<
    TEngine extends Engine = Engine,
> extends System<TEngine> {
    #gravityScale: number = 0;
    #gravityDirection: Vector = new Vector(0)
    #currentGravity: Vector = new Vector(0)

    #rigidbodies: Map<string, C_Rigidbody<TEngine>> = new Map()

    #pairs: [C_Collider<TEngine>, C_Collider<TEngine>][] = [];
    #pairIndex: number = 0;
    #timeAccumulator: number = 0;

    get gravityScale() {
        return this.#gravityScale;
    }

    set gravityScale(scale: number) {
        this.#gravityScale = scale;
        this.#updateGravity();
    }

    get gravityDirection() {
        return this.#gravityDirection;
    }

    set gravityDirection(direction: VectorConstructor) {
        this.#gravityDirection.set(direction);
        this.#gravityDirection.normalizeMut();
        this.#updateGravity();
    }

    #updateGravity(): void {
        this.#currentGravity.set(this.#gravityDirection);
        this.#currentGravity.scaleMut(this.#gravityScale);
    }

    override lateUpdate(deltaTime: number): boolean | void {
        // Accumulate time
        this.#timeAccumulator += deltaTime;
        
        // Cap accumulation to prevent "spiral of death" where physics can't keep up
        if (this.#timeAccumulator > MAX_TIMESTEP_ACCUMULATION) {
            this.#timeAccumulator = MAX_TIMESTEP_ACCUMULATION;
        }
        
        // Run physics updates at fixed timestep
        const fixedTimeStep = 1 / this._engine.options.physicsPerSecond;
        while (this.#timeAccumulator >= fixedTimeStep) {
            this.#physicsUpdate(fixedTimeStep);
            
            this.#broadPhase();
            this.#narrowPhase();
            
            this.#timeAccumulator -= fixedTimeStep;
        }
    }

    registerRigidbody(rb: C_Rigidbody<TEngine>): void {
        this.#rigidbodies.set(rb.id, rb);
    }

    unregisterRigidbody(rb: C_Rigidbody<TEngine>): void {
        this.#rigidbodies.delete(rb.id);
    }

    #physicsUpdate(deltaTime: number): void {
        for (const rb of this.#rigidbodies.values()) {
            rb.physicsUpdate(deltaTime, this.#currentGravity);
        }
    }

    #broadPhase(): void {
        this.#pairIndex = 0;
        if (this._engine.rootEntity.childColliderCount > 0) {
            this.#broadPhaseRecurse(this._engine.rootEntity);
        }
    }

    #broadPhaseRecurse(entity: Readonly<Entity<TEngine>>): void {
        const children = entity.children;
        const childCount = children.length;
        
        for (let i = 0; i < childCount; i++) {
            const childI = children[i];
            const bboxI = childI.transform.boundingBox;
            
            for (let j = i + 1; j < childCount; j++) {
                const childJ = children[j];
                
                if (boundingBoxesIntersect(bboxI, childJ.transform.boundingBox)) {
                    this.#broadPhaseDescend(childI, childJ);
                }
            }
        }

        for (const child of entity.children) {
            if (child.childColliderCount > 0) {
                this.#broadPhaseRecurse(child);
            }
        }
    }

    #broadPhaseDescend(
        entityA: Readonly<Entity<TEngine>>,
        entityB: Readonly<Entity<TEngine>>,
    ) {
        if (entityA.collider && entityB.collider) {
            if (entityA.collider.rigidbody || entityB.collider.rigidbody) {
                if (this.#pairIndex < this.#pairs.length) {
                    this.#pairs[this.#pairIndex][0] = entityA.collider;
                    this.#pairs[this.#pairIndex][1] = entityB.collider;
                } else {
                    this.#pairs.push([entityA.collider, entityB.collider]);
                }
                this.#pairIndex++;
            }
        }

        const bboxA = entityA.transform.boundingBox;
        const bboxB = entityB.transform.boundingBox;
    
        const childrenA = entityA.children;
        for (let i = 0; i < childrenA.length; i++) {
            const child = childrenA[i];
            if (
                child.childColliderCount > 0 &&
                boundingBoxesIntersect(child.transform.boundingBox, bboxB)
            ) {
                this.#broadPhaseDescend(child, entityB);
            }
        }

        const childrenB = entityB.children;
        for (let i = 0; i < childrenB.length; i++) {
            const child = childrenB[i];
            if (
                child.childColliderCount > 0 &&
                boundingBoxesIntersect(bboxA, child.transform.boundingBox)
            ) {
                this.#broadPhaseDescend(entityA, child);
            }
        }
    }

    #narrowPhase() {
        let resolvedAny = false;
        const pairCount = this.#pairIndex;
        
        for (let i = 0; i < this._engine.options.maxCollisionIterations; i++) {
            resolvedAny = false;
            
            for (let p = 0; p < pairCount; p++) {
                const [collA, collB] = this.#pairs[p];
                const contact = collA.resolveCollision(collB);
                
                if (contact) {
                    this.#resolveContact(contact);
                    resolvedAny = true;
                    
                    if (i === 0) {
                        if (collA.entity.onCollision) {
                            collA.entity.onCollision(contact);
                        }
                        
                        const componentsA = collA.entity.components;
                        for (let c = 0; c < componentsA.length; c++) {
                            componentsA[c].onCollision?.(contact);
                        }

                        const flippedContact: CollisionContact<TEngine> = {
                            ...contact,
                            contactNormal: contact.contactNormal.negate(),
                            collA: contact.collB,
                            collB: contact.collA,
                        };
                        
                        if (collB.entity.onCollision) {
                            collB.entity.onCollision(flippedContact);
                        }
                        
                        const componentsB = collB.entity.components;
                        for (let c = 0; c < componentsB.length; c++) {
                            componentsB[c].onCollision?.(flippedContact);
                        }
                    }
                }
            }

            if (!resolvedAny) {
                break;
            }
        }
    }

    #resolveContact({
        contactNormal,
        penetrationDepth,
        collA,
        collB,
    }: CollisionContact<TEngine>) {
        if (penetrationDepth < MIN_PENETRATION_DEPTH) {
            return;
        }
        
        const collARigidbody = collA.rigidbody;
        const collBRigidbody = collB.rigidbody;
        const invMassA = collARigidbody ? collARigidbody.invMass : 0;
        const invMassB = collBRigidbody ? collBRigidbody.invMass : 0;
        const totalInvMass = invMassA + invMassB;
        if (totalInvMass === 0) {
            return;
        }

        let ratioA = invMassA / totalInvMass;
        let ratioB = invMassB / totalInvMass;
        if (ratioA < INV_MASS_EPSILON) {
            ratioA = 0;
            ratioB = 1;
        } else if (ratioB < INV_MASS_EPSILON) {
            ratioA = 1;
            ratioB = 0;
        }

        if (ratioA > 0) {
            collA.entity.move(contactNormal.scaleBy(penetrationDepth * ratioA));
        }
        if (ratioB > 0) {
            collB.entity.move(
                contactNormal.scaleBy(penetrationDepth * -ratioB),
            );
        }

        if (collARigidbody || collBRigidbody) {
            const velocityA = collARigidbody ? collARigidbody.velocity : ZERO_VECTOR;
            const velocityB = collBRigidbody ? collBRigidbody.velocity : ZERO_VECTOR;
            
            const relativeVelocity = velocityA.sub(velocityB);
            const velocityAlongNormal = relativeVelocity.dot(contactNormal);
            
            if (velocityAlongNormal > 0) {
                return;
            }
            
            const bounceA = collARigidbody ? collARigidbody.bounce : 0;
            const bounceB = collBRigidbody ? collBRigidbody.bounce : 0;
            const bounce = Math.min(bounceA, bounceB);
            
            const impulseScalar = -(1 + bounce) * velocityAlongNormal / totalInvMass;
            const impulse = contactNormal.scaleBy(impulseScalar);
            
            if (collARigidbody) {
                collARigidbody.addImpulse(impulse);
            }
            if (collBRigidbody) {
                collBRigidbody.addImpulse(impulse.negate());
            }
        }
    }
}
