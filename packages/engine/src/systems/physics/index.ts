import { type C_Collider } from '../../components/colliders';
import { type C_CircleCollider } from '../../components/colliders/CircleCollider';
import { type C_RectangleCollider } from '../../components/colliders/RectangleCollider';
import type { Engine } from '../../engine';
import { type Entity } from '../../entities';
import {
    type IVector,
    type ImmutableVector,
    Vector,
    type VectorConstructor,
} from '../../math/vector';
import type { CollisionContact } from '../../types';
import { System } from '../index';
import { SpatialHashGrid, type SpatialHashGridStats } from './spatialHash';

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
    public static typeString: string = 'PhysicsSystem';

    #gravityScale: number = 0;
    #gravityDirection: Vector = new Vector(0);
    #currentGravity: Vector = new Vector(0);

    #physicsEntities: Map<string, Entity<TEngine>> = new Map();

    #pairs: [C_Collider<TEngine>, C_Collider<TEngine>][] = [];
    #pairIndex: number = 0;
    #timeAccumulator: number = 0;

    #raycasts: Raycast<TEngine>[] = [];

    #collisionSpatialGrid: SpatialHashGrid<Entity<TEngine>>;
    #pointerTargetSpatialGrid: SpatialHashGrid<Entity<TEngine>>;

    constructor(engine: TEngine) {
        super(engine);

        this.#collisionSpatialGrid = new SpatialHashGrid(
            engine.options.spatialHashCellSize,
        );
        this.#pointerTargetSpatialGrid = new SpatialHashGrid(
            engine.options.spatialHashCellSize,
        );
    }

    override get typeString(): string {
        return PhysicsSystem.typeString;
    }

    get gravityScale() {
        return this.#gravityScale;
    }

    set gravityScale(scale: number) {
        this.#gravityScale = scale;
        this.#updateGravity();
    }

    get gravityDirection(): ImmutableVector {
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

    get collisionSpatialGrid() {
        return this.#collisionSpatialGrid;
    }

    get pointerTargetSpatialGrid() {
        return this.#pointerTargetSpatialGrid;
    }

    getStats(): Readonly<SpatialHashGridStats> | null {
        return this.#collisionSpatialGrid.getStats();
    }

    override earlyUpdate(): boolean | void {
        this.#raycasts.length = 0;
    }

    override lateUpdate(deltaTime: number): boolean | void {
        this.#timeAccumulator = Math.min(
            this.#timeAccumulator + deltaTime,
            MAX_TIMESTEP_ACCUMULATION,
        );

        const fixedTimeStep = 1 / this._engine.options.physicsPerSecond;
        while (this.#timeAccumulator >= fixedTimeStep) {
            this.#physicsUpdate(fixedTimeStep);

            this.#buildSpatialGrid();

            this.#broadPhase();
            this.#narrowPhase();

            this.#timeAccumulator -= fixedTimeStep;
        }
    }

    registerPhysicsEntity(entity: Entity<TEngine>): void {
        this.#physicsEntities.set(entity.id, entity);
    }

    unregisterPhysicsEntity(entity: Entity<TEngine>): void {
        this.#physicsEntities.delete(entity.id);
        this.#collisionSpatialGrid.remove(entity);
        this.#pointerTargetSpatialGrid.remove(entity);
    }

    raycast(request: RaycastRequest<TEngine>): Raycast<TEngine>['result'] {
        const { origin, direction, maxDistance, ignoreEntity } = request;
        const originX = origin.x;
        const originY = origin.y;
        const dirLength = Math.hypot(direction.x, direction.y);
        if (dirLength === 0) {
            this.#raycasts.push({
                request,
                result: null,
            });
            return null;
        }

        const invDirLength = 1 / dirLength;
        const dirX = direction.x * invDirLength;
        const dirY = direction.y * invDirLength;
        let closest: RaycastResult<TEngine> | null = null;
        let closestDist = maxDistance;

        const checkEntity = (entity: Readonly<Entity<TEngine>>): void => {
            if (entity === ignoreEntity) return;

            if (entity.collider) {
                const result =
                    entity.collider.type === 'circle'
                        ? this.#raycastCircle(
                              entity.collider as C_CircleCollider<TEngine>,
                              originX,
                              originY,
                              dirX,
                              dirY,
                              closestDist,
                          )
                        : this.#raycastRectangle(
                              entity.collider as C_RectangleCollider<TEngine>,
                              originX,
                              originY,
                              dirX,
                              dirY,
                              closestDist,
                          );

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
        originX: number,
        originY: number,
        dirX: number,
        dirY: number,
        maxDistance: number,
    ): RaycastResult<TEngine> | null {
        const center = collider.entity.position;
        const radius = collider.radius;
        const toCenterX = center.x - originX;
        const toCenterY = center.y - originY;
        const projection = toCenterX * dirX + toCenterY * dirY;
        if (projection < 0) return null;

        const distSq =
            toCenterX * toCenterX +
            toCenterY * toCenterY -
            projection * projection;
        const radiusSq = radius * radius;
        if (distSq > radiusSq) return null;

        const distance = projection - Math.sqrt(radiusSq - distSq);
        if (distance < 0 || distance > maxDistance) return null;

        return {
            collider,
            point: new Vector(
                originX + dirX * distance,
                originY + dirY * distance,
            ),
            distance,
        };
    }

    #raycastRectangle(
        collider: C_RectangleCollider<TEngine>,
        originX: number,
        originY: number,
        dirX: number,
        dirY: number,
        maxDistance: number,
    ): RaycastResult<TEngine> | null {
        const corners = collider.entity.transform.corners;
        let closestT = Infinity;
        let hasHit = false;

        for (let i = 0; i < 4; i++) {
            const start = corners[i];
            const end = corners[(i + 1) % 4];
            const edgeX = end.x - start.x;
            const edgeY = end.y - start.y;
            const edgeLengthSq = edgeX * edgeX + edgeY * edgeY;
            if (edgeLengthSq === 0) continue;

            const edgeLength = Math.sqrt(edgeLengthSq);
            const invEdgeLength = 1 / edgeLength;
            const normalX = -edgeY * invEdgeLength;
            const normalY = edgeX * invEdgeLength;
            const denom = dirX * normalX + dirY * normalY;
            if (Math.abs(denom) < 1e-10) continue;

            const toStartX = start.x - originX;
            const toStartY = start.y - originY;
            const t = (toStartX * normalX + toStartY * normalY) / denom;
            if (t < 0 || t > maxDistance || t >= closestT) continue;

            const hitX = originX + dirX * t;
            const hitY = originY + dirY * t;
            const proj = (hitX - start.x) * edgeX + (hitY - start.y) * edgeY;
            if (proj >= 0 && proj <= edgeLengthSq) {
                closestT = t;
                hasHit = true;
            }
        }

        return hasHit
            ? {
                  collider,
                  point: new Vector(
                      originX + dirX * closestT,
                      originY + dirY * closestT,
                  ),
                  distance: closestT,
              }
            : null;
    }

    #physicsUpdate(deltaTime: number): void {
        for (const entity of this.#physicsEntities.values()) {
            const rb = entity.rigidbody;
            rb?.physicsUpdate(deltaTime, this.#currentGravity);
        }
    }

    #broadPhase(): void {
        this.#pairIndex = 0;
        if (this._engine.rootEntity.childColliderCount === 0) {
            return;
        }

        const pairs = this.#collisionSpatialGrid.queryPairs();
        for (const [entityA, entityB] of pairs) {
            this.#broadPhaseDescend(entityA, entityB);
        }
    }

    #buildSpatialGrid(): void {
        this.#collisionSpatialGrid.clear();
        this.#pointerTargetSpatialGrid.clear();
        for (const entity of this.#physicsEntities.values()) {
            const collider = entity.collider;
            if (collider) {
                if (collider.collisionMode !== 'none') {
                    this.#collisionSpatialGrid.insert(entity);
                }
                if (collider.pointerTarget) {
                    this.#pointerTargetSpatialGrid.insert(entity);
                }
            }
        }
    }

    #broadPhaseDescend(
        entityA: Readonly<Entity<TEngine>>,
        entityB: Readonly<Entity<TEngine>>,
    ) {
        if (
            entityA.collider &&
            entityB.collider &&
            entityA.collider.collisionMode !== 'none' &&
            entityB.collider.collisionMode !== 'none'
        ) {
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
                child.transform.boundingBox.intersects(bboxB)
            ) {
                this.#broadPhaseDescend(child, entityB);
            }
        }

        const childrenB = entityB.children;
        for (let i = 0; i < childrenB.length; i++) {
            const child = childrenB[i];
            if (
                child.childColliderCount > 0 &&
                bboxA.intersects(child.transform.boundingBox)
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
            const isFirstIteration = i === 0;

            for (let p = 0; p < pairCount; p++) {
                const [collA, collB] = this.#pairs[p];
                const isTriggerPair =
                    collA.collisionMode === 'trigger' ||
                    collB.collisionMode === 'trigger';
                const contact =
                    !isTriggerPair || isFirstIteration
                        ? collA.resolveCollision(collB)
                        : null;
                if (contact) {
                    if (isFirstIteration) {
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

                    if (!isTriggerPair) {
                        this.#resolveContact(contact);
                        resolvedAny = true;
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
            const velocityA = collARigidbody
                ? collARigidbody.velocity
                : ZERO_VECTOR;
            const velocityB = collBRigidbody
                ? collBRigidbody.velocity
                : ZERO_VECTOR;

            const relativeVelocity = velocityA.sub(velocityB);
            const velocityAlongNormal = relativeVelocity.dot(contactNormal);

            if (velocityAlongNormal > 0) {
                return;
            }

            const bounceA = collARigidbody ? collARigidbody.bounce : 0;
            const bounceB = collBRigidbody ? collBRigidbody.bounce : 0;
            const bounce = Math.min(bounceA, bounceB);

            const impulseScalar =
                (-(1 + bounce) * velocityAlongNormal) / totalInvMass;
            const impulse = contactNormal.scaleBy(impulseScalar);

            if (collARigidbody) {
                collARigidbody.addImpulse(impulse);
            }
            if (collBRigidbody) {
                collBRigidbody.addImpulse(impulse.negate());
            }
        }
    }

    #updateGravity(): void {
        this.#currentGravity.set(this.#gravityDirection);
        this.#currentGravity.scaleMut(this.#gravityScale);
    }
}
