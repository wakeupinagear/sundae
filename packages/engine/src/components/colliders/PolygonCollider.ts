import { type Engine } from '../../engine';
import { type BoundingBox } from '../../math/boundingBox';
import { Vector } from '../../math/vector';
import { C_Polygon } from '../polygon';
import { C_Collider, type C_ColliderOptions } from './index';

interface C_PolygonColliderOptions extends C_ColliderOptions {}

export interface C_PolygonColliderJSON extends C_PolygonColliderOptions {
    type: 'polygonCollider';
}

export class C_PolygonCollider<
    TEngine extends Engine = Engine,
> extends C_Collider<TEngine> {
    public static typeString: string = 'C_PolygonCollider';

    constructor(options: C_PolygonColliderOptions) {
        super(options);

        this._type = 'polygon';
    }

    override get typeString(): string {
        return C_PolygonCollider.typeString;
    }

    #getWorldVertices(): { x: number; y: number }[] {
        const polygon = this.entity
            .getComponentsInTree<C_Polygon<TEngine>>(C_Polygon.typeString)
            .find((c) => c.entity === this.entity);
        if (!polygon || polygon.points.length < 3) {
            return [];
        }
        const worldMatrix = this.entity.transform.worldMatrix;
        return polygon.points.map((p) => worldMatrix.transformPoint(p));
    }

    override _computeCollisionBounds(): void {
        const verts = this.#getWorldVertices();
        if (verts.length < 3) {
            this._collisionBounds = [];
            return;
        }
        if (this._collisionBounds.length !== verts.length) {
            this._collisionBounds = verts.map((v) => new Vector(v));
        } else {
            for (let i = 0; i < verts.length; i++) {
                this._collisionBounds[i].set(verts[i]);
            }
        }
    }

    override checkIfPointInside(worldPosition: Vector): boolean {
        const verts = this.#getWorldVertices();
        if (verts.length < 3) {
            return false;
        }
        const px = worldPosition.x;
        const py = worldPosition.y;
        let inside = false;
        const n = verts.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = verts[i].x;
            const yi = verts[i].y;
            const xj = verts[j].x;
            const yj = verts[j].y;
            if (yi > py !== yj > py) {
                const xIntersect =
                    xj + ((py - yj) * (xi - xj)) / (yi - yj);
                if (px < xIntersect) {
                    inside = !inside;
                }
            }
        }
        return inside;
    }

    override checkIfBoxIntersects(_bbox: BoundingBox): boolean {
        // Stub: not implemented
        return false;
    }
}
