import { System } from '.';
import { C_Collider } from '../components/colliders';
import type { Engine } from '../engine';
import { Entity, boundingBoxesIntersect } from '../exports';

const MAX_NARROW_PHASE_ITERATIONS = 10;

/*
contactNormal (unit)

penetrationDepth

point (for friction later)
*/
export interface CollisionContact {}

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
        for (const child of entity.children) {
            for (const otherChild of entity.children) {
                if (
                    otherChild !== child &&
                    boundingBoxesIntersect(
                        child.transform.boundingBox,
                        otherChild.transform.boundingBox,
                    )
                ) {
                    this.#broadPhaseDescend(child, otherChild);
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
        const contacts: CollisionContact[] = [];
        if (this.#pairs.length > 0) {
            console.log(this.#pairs);
        }
        for (const [collA, collB] of this.#pairs) {
            const contact = collA.resolveCollision(collB);
            if (contact) {
                contacts.push(contact);
            }
        }

        if (contacts.length > 0) {
            console.log(contacts);
        }

        for (let i = 0; i < MAX_NARROW_PHASE_ITERATIONS; i++) {}
    }
}
