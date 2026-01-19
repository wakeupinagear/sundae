import { System } from '..';
import { C_Collider } from '../../components/colliders';
import { C_CircleCollider } from '../../components/colliders/CircleCollider';
import { C_RectangleCollider } from '../../components/colliders/RectangleCollider';
import { C_Rigidbody } from '../../components/rigidbody';
import type { Engine } from '../../engine';
import { Entity, IVector, ImmutableVector, Vector, VectorConstructor, boundingBoxesIntersect } from '../../exports';
import type { CollisionContact } from '../../types';
import { SpatialHashGrid } from './spatialHash';

const INV_MASS_EPSILON = 1e-6;
const MIN_PENETRATION_DEPTH = 0.01;
const MAX_TIMESTEP_ACCUMULATION = 0.25;

const ZERO_VECTOR = new Vector(0);

export interface RaycastRequest<TEngine extends Engine = Engine> {
    origin: IVector<number>;
    direction: IVector<number>;
    maxDistance: number;
    ignoreEntity?: Entity<TEngine> | null;
}

export interface RaycastResult<TEngine extends Engine = Engine> {
    collider: C_Collider<TEngine>;
    point: Vector;
    distance: number;
}

export interface Raycast<TEngine extends Engine = Engine> {
    request: RaycastRequest<TEngine>;
    result: RaycastResult<TEngine> | null;
}

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

    #raycasts: Raycast<TEngine>[] = [];
    
    #spatialGrid: SpatialHashGrid<TEngine>;
    #useSpatialHash: boolean = true;

    constructor(engine: TEngine) {
        super(engine);
        this.#spatialGrid = new SpatialHashGrid(engine.options.spatialHashCellSize);
    }

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

    get raycastsThisFrame(): Readonly<Raycast<TEngine>[]> {
        return this.#raycasts;
    }

    get spatialGridStats() {
        return this.#spatialGrid.getStats();
    }

    #updateGravity(): void {
        this.#currentGravity.set(this.#gravityDirection);
        this.#currentGravity.scaleMut(this.#gravityScale);
    }

    override earlyUpdate(): boolean | void {
        this.#raycasts.length = 0;
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

    raycast(request: RaycastRequest<TEngine>): Raycast<TEngine>['result'] {
        const { origin: _origin, direction, maxDistance, ignoreEntity } = request;
        const origin = new Vector(_origin);
        const dir = new Vector(direction).normalize();
        let closest: RaycastResult<TEngine> | null = null;
        let closestDist = maxDistance;
        
        const checkEntity = (entity: Readonly<Entity<TEngine>>): void => {
            if (entity === ignoreEntity) return;
            
            if (entity.collider) {
                const result = entity.collider.type === 'circle'
                    ? this.#raycastCircle(entity.collider as C_CircleCollider<TEngine>, origin, dir, closestDist)
                    : this.#raycastRectangle(entity.collider as C_RectangleCollider<TEngine>, origin, dir, closestDist);
                
                if (result && result.distance < closestDist) {
                    closest = result;
                    closestDist = result.distance;
                }
            }
            
            for (const child of entity.children) {
                if (child.collider || child.childColliderCount > 0) {
                    checkEntity(child);
                }
            }
        };
        checkEntity(this._engine.rootEntity);

        this.#raycasts.push({
            request,
            result: closest,
        });

        return closest;
    }
    
    #raycastCircle(
        collider: C_CircleCollider<TEngine>,
        origin: ImmutableVector,
        direction: ImmutableVector,
        maxDistance: number,
    ): RaycastResult<TEngine> | null {
        const center = collider.entity.position;
        const radius = collider.radius;
        const toCenter = center.sub(origin);
        const projection = toCenter.dot(direction);
        if (projection < 0) return null;
        
        const distSq = toCenter.lengthSquared() - projection * projection;
        const radiusSq = radius * radius;
        if (distSq > radiusSq) return null;
        
        const distance = projection - Math.sqrt(radiusSq - distSq);
        if (distance < 0 || distance > maxDistance) return null;
        
        const point = origin.add(direction.scaleBy(distance));

        return {
            collider,
            point,
            distance,
        };
    }
    
    #raycastRectangle(
        collider: C_RectangleCollider<TEngine>,
        origin: ImmutableVector,
        direction: ImmutableVector,
        maxDistance: number,
    ): RaycastResult<TEngine> | null {
        const corners = collider.entity.transform.corners;
        let closestT = Infinity;
        let closestNormal: Vector | null = null;
        
        for (let i = 0; i < 4; i++) {
            const start = corners[i];
            const edge = corners[(i + 1) % 4].sub(start);
            const normal = new Vector(-edge.y, edge.x).normalize();
            const denom = direction.dot(normal);
            if (Math.abs(denom) < 1e-10) continue;
            
            const t = start.sub(origin).dot(normal) / denom;
            if (t < 0 || t > maxDistance || t >= closestT) continue;
            
            const proj = origin.add(direction.scaleBy(t)).sub(start).dot(edge);
            if (proj >= 0 && proj <= edge.lengthSquared()) {
                closestT = t;
                closestNormal = denom < 0 ? normal : normal.negate();
            }
        }
        
        return closestNormal ? {
            collider,
            point: origin.add(direction.scaleBy(closestT)),
            distance: closestT,
        } : null;
    }

    #physicsUpdate(deltaTime: number): void {
        for (const rb of this.#rigidbodies.values()) {
            rb.physicsUpdate(deltaTime, this.#currentGravity);
        }
    }

    #broadPhase(): void {
        this.#pairIndex = 0;
        if (this._engine.rootEntity.childColliderCount === 0) {
            return;
        }

        this.#spatialGrid.clear();
        this.#buildSpatialGrid(this._engine.rootEntity);

        const pairs = this.#spatialGrid.queryPairs();
        for (const [entityA, entityB] of pairs) {
            this.#broadPhaseDescend(entityA, entityB);
        }
    }

    #buildSpatialGrid(entity: Readonly<Entity<TEngine>>): void {
        if (entity.collider) {
            this.#spatialGrid.insert(entity as Entity<TEngine>);
        }

        for (const child of entity.children) {
            if (child.collider || child.childColliderCount > 0) {
                this.#buildSpatialGrid(child);
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
                            self: contact.other,
                            other: contact.self,
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
        self: collA,
        other: collB,
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
