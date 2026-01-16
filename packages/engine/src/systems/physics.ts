import { System } from '.';
import { C_Collider } from '../components/colliders';
import type { Engine } from '../engine';
import { Entity, boundingBoxesIntersect } from '../exports';
import type { CollisionContact } from '../types';

const MAX_NARROW_PHASE_ITERATIONS = 5;
const INV_MASS_EPSILON = 1e-6;

export class PhysicsSystem<
    TEngine extends Engine = Engine,
> extends System<TEngine> {
    #pairs: [C_Collider<TEngine>, C_Collider<TEngine>][] = [];

    lateUpdate(): boolean | void {
        this.#broadPhase();
        this.#narrowPhase();
    }

    #broadPhase() {
        this.#pairs = [];
        if (this._engine.rootEntity.childColliderCount > 0) {
            this.#broadPhaseRecurse(this._engine.rootEntity);
        }
    }

    #broadPhaseRecurse(entity: Readonly<Entity<TEngine>>) {
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
        for (let i = 0; i < MAX_NARROW_PHASE_ITERATIONS; i++) {
            let resolvedAny = false;
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
    }
}
