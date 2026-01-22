import { C_Collider, type C_ColliderOptions } from './index';
import { type Engine } from '../../engine';
import { type Vector } from '../../math/vector';
import { type BoundingBox } from '../../types';
import { boundingBoxesIntersect } from '../../utils';

interface C_RectangleColliderOptions extends C_ColliderOptions {}

export interface C_RectangleColliderJSON extends C_RectangleColliderOptions {
    type: 'rectangleCollider';
}

// Technically an OBB :)
export class C_RectangleCollider<
    TEngine extends Engine = Engine,
> extends C_Collider<TEngine> {
    public static typeString: string = 'C_RectangleCollider';

    constructor(options: C_RectangleColliderOptions) {
        super(options);

        this._type = 'rectangle';
    }

    override get typeString(): string {
        return C_RectangleCollider.typeString;
    }

    override _computeCollisionBounds(): void {
        const corners = this.entity.transform.corners;
        if (this._collisionBounds.length !== 4) {
            this._collisionBounds = [
                corners[0].clone(),
                corners[1].clone(),
                corners[2].clone(),
                corners[3].clone(),
            ];
        } else {
            this._collisionBounds[0].set(corners[0]);
            this._collisionBounds[1].set(corners[1]);
            this._collisionBounds[2].set(corners[2]);
            this._collisionBounds[3].set(corners[3]);
        }
    }

    override checkIfPointInside(worldPosition: Vector): boolean {
        const corners = this.entity.transform.corners;

        for (let i = 0; i < 4; i++) {
            const p1 = corners[i];
            const p2 = corners[(i + 1) % 4];
            
            const edge = p2.sub(p1);
            const toPoint = worldPosition.sub(p1);
            
            const cross = edge.x * toPoint.y - edge.y * toPoint.x;
            if (cross < 0) {
                return false;
            }
        }
        
        return true;
    }

    override checkIfBoxIntersects(bbox: BoundingBox): boolean {
        const transform = this.entity?.transform;
        if (!transform) {
            return false;
        }

        return boundingBoxesIntersect(bbox, transform.boundingBox);
    }
}
