import { System } from '.';
import { C_Collider } from '../components/colliders';
import { C_Rigidbody } from '../components/rigidbody';
import type { Engine } from '../engine';
import { Entity, Vector, VectorConstructor, boundingBoxesIntersect } from '../exports';
import type { CollisionContact } from '../types';

const MAX_NARROW_PHASE_ITERATIONS = 12;
const INV_MASS_EPSILON = 1e-6;

export class PhysicsSystem<
    TEngine extends Engine = Engine,
> extends System<TEngine> {
    #gravityScale: number = 0;
    #gravityDirection: Vector = new Vector(0)

    #rigidbodies: Map<string, C_Rigidbody<TEngine>> = new Map()

    #pairs: [C_Collider<TEngine>, C_Collider<TEngine>][] = [];

    get gravityScale() {
        return this.#gravityScale;
    }

    set gravityScale(scale: number) {
        this.#gravityScale = scale;
    }

    get gravityDirection() {
        return this.#gravityDirection;
    }

    set gravityDirection(direction: VectorConstructor) {
        this.#gravityDirection.set(direction);
        this.#gravityDirection.normalizeMut();
    }

    override lateUpdate(deltaTime: number): boolean | void {
        this.#physicsUpdate(deltaTime);
        this.#broadPhase();
        this.#narrowPhase();
    }

    registerRigidbody(rb: C_Rigidbody<TEngine>): void {
        this.#rigidbodies.set(rb.id, rb);
    }

    unregisterRigidbody(rb: C_Rigidbody<TEngine>): void {
        this.#rigidbodies.delete(rb.id);
    }

    #physicsUpdate(deltaTime: number): void {
        const currentGravity = this.#gravityDirection.scaleBy(this.#gravityScale);
        for (const rb of this.#rigidbodies.values()) {
            rb.physicsUpdate(deltaTime, currentGravity);
        }
    }

    #broadPhase(): void {
        this.#pairs = [];
        if (this._engine.rootEntity.childColliderCount > 0) {
            this.#broadPhaseRecurse(this._engine.rootEntity);
        }
    }

    #broadPhaseRecurse(entity: Readonly<Entity<TEngine>>): void {
        const children = entity.children;
        for (let i = 0; i < children.length; i++) {
            for (let j = i + 1; j < children.length; j++) {
                if (
                    boundingBoxesIntersect(
                        children[i].transform.boundingBox,
                        children[j].transform.boundingBox,
                    )
                ) {
                    this.#broadPhaseDescend(children[i], children[j]);
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
            this.#pairs.push([entityA.collider, entityB.collider]);
        }

        for (const child of entityA.children) {
            if (
                child.childColliderCount > 0 &&
                boundingBoxesIntersect(
                    child.transform.boundingBox,
                    entityB.transform.boundingBox,
                )
            ) {
                this.#broadPhaseDescend(child, entityB);
            }
        }

        for (const child of entityB.children) {
            if (
                child.childColliderCount > 0 &&
                boundingBoxesIntersect(
                    entityA.transform.boundingBox,
                    child.transform.boundingBox,
                )
            ) {
                this.#broadPhaseDescend(entityA, child);
            }
        }
    }

    #narrowPhase() {
        let resolvedAny = false;
        for (let i = 0; i < MAX_NARROW_PHASE_ITERATIONS; i++) {
            for (const [collA, collB] of this.#pairs) {
                const contact = collA.resolveCollision(collB);
                if (contact) {
                    this.#resolveContact(contact);
                    resolvedAny = true;
                    if (i === 0) {
                        collA.entity.onCollision?.(contact);
                        for (const component of collA.entity.components) {
                            component.onCollision?.(contact);
                        }

                        const flippedContact: CollisionContact<TEngine> = {
                            ...contact,
                            contactNormal: contact.contactNormal.negate(),
                            collA: contact.collB,
                            collB: contact.collA,
                        };
                        collB.entity.onCollision?.(flippedContact);
                        for (const component of collB.entity.components) {
                            component.onCollision?.(flippedContact);
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
            const velocityA = collARigidbody ? collARigidbody.velocity : new Vector(0);
            const velocityB = collBRigidbody ? collBRigidbody.velocity : new Vector(0);
            
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
