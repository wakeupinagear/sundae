import { Component, type ComponentOptions } from '.';
import { Engine } from '../engine';
import { Matrix2D } from '../math/matrix';
import { Vector, type VectorConstructor } from '../math/vector';
import type { BoundingBox } from '../types';

export interface C_TransformOptions extends ComponentOptions {
    position: VectorConstructor;
    rotation: number;
    scale: VectorConstructor;
}

export interface C_TransformJSON extends C_TransformOptions {
    type: 'transform';
}

export class C_Transform<
    TEngine extends Engine = Engine,
> extends Component<TEngine> {
    #position: Vector = new Vector(0);
    #rotation: number = 0;
    #scale: Vector = new Vector(1);

    #positionOffset: Vector = new Vector(0);
    #scaleMult: Vector = new Vector(1);

    #localMatrix: Matrix2D = new Matrix2D();
    #localMatrixDirty: boolean = true;

    #worldMatrix: Matrix2D = new Matrix2D();
    #worldMatrixDirty: boolean = true;
    #worldPosition: Vector = new Vector(0);

    #boundingBox: BoundingBox = { x1: 0, x2: 0, y1: 0, y2: 0 };
    #corners: [Vector, Vector, Vector, Vector] = [
        new Vector(0),
        new Vector(0),
        new Vector(0),
        new Vector(0),
    ];
    #boundsDirty: boolean = true;

    constructor(options: C_TransformOptions) {
        const { name = 'transform', ...rest } = options;
        super({
            name,
            ...rest,
        });
        this.#position = new Vector(options.position);
        this.#rotation = options.rotation;
        this.#scale = new Vector(options.scale);
    }

    override get typeString(): string {
        return 'C_Transform';
    }

    get position(): Readonly<Vector> {
        return this.#position;
    }

    get worldPosition(): Readonly<Vector> {
        this.#worldPosition.x = this.worldMatrix.e;
        this.#worldPosition.y = this.worldMatrix.f;

        return this.#worldPosition;
    }

    get rotation(): number {
        return this.#rotation;
    }

    get worldRotation(): number {
        const matrix = this.worldMatrix;
        return Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
    }

    get scale(): Readonly<Vector> {
        return this.#scale;
    }

    get scaleMult(): Readonly<Vector> {
        return this.#scaleMult;
    }

    get localMatrix(): Readonly<Matrix2D> {
        if (this.#localMatrixDirty) {
            this.#computeLocalMatrix();
            this.#localMatrixDirty = false;
        }

        return this.#localMatrix;
    }

    get worldMatrix(): Readonly<Matrix2D> {
        if (this.#worldMatrixDirty) {
            this.#computeWorldMatrix();
            this.#boundsDirty = true;
        }

        return this.#worldMatrix;
    }

    get boundingBox(): Readonly<BoundingBox> {
        if (this.#boundsDirty) {
            this.#computeBoundingBox();
            this.#boundsDirty = false;
        }

        return this.#boundingBox;
    }

    get corners(): Readonly<[Vector, Vector, Vector, Vector]> {
        if (this.#boundsDirty) {
            this.#computeBoundingBox();
            this.#boundsDirty = false;
        }

        return this.#corners;
    }

    setPosition(position: VectorConstructor): void {
        const x = typeof position === 'number' ? position : position.x;
        const y = typeof position === 'number' ? position : position.y;
        if (x !== this.#position.x || y !== this.#position.y) {
            this.#position.x = x;
            this.#position.y = y;
            this.#markLocalDirty();
        }
    }

    setRotation(rotation: number): void {
        if (rotation !== this.#rotation) {
            this.#rotation = rotation;
            this.#markLocalDirty();
        }
    }

    setScale(scale: VectorConstructor): void {
        const x = typeof scale === 'number' ? scale : scale.x;
        const y = typeof scale === 'number' ? scale : scale.y;
        if (x !== this.#scale.x || y !== this.#scale.y) {
            this.#scale.x = x;
            this.#scale.y = y;
            this.#markLocalDirty();
        }
    }

    setPositionOffset(positionOffset: VectorConstructor): void {
        const x =
            typeof positionOffset === 'number'
                ? positionOffset
                : positionOffset.x;
        const y =
            typeof positionOffset === 'number'
                ? positionOffset
                : positionOffset.y;
        if (x !== this.#positionOffset.x || y !== this.#positionOffset.y) {
            this.#positionOffset.x = x;
            this.#positionOffset.y = y;
            this.#markLocalDirty();
        }
    }

    setScaleMult(scaleMult: VectorConstructor): void {
        const x = typeof scaleMult === 'number' ? scaleMult : scaleMult.x;
        const y = typeof scaleMult === 'number' ? scaleMult : scaleMult.y;
        if (x !== this.#scaleMult.x || y !== this.#scaleMult.y) {
            this.#scaleMult.x = x;
            this.#scaleMult.y = y;
            this.#markLocalDirty();
        }
    }

    translate(delta: VectorConstructor): void {
        this.setPosition(this.#position.add(delta));
    }

    rotate(delta: number): void {
        this.setRotation(this.#rotation + delta);
    }

    scaleBy(delta: VectorConstructor): void {
        this.setScale(this.#scale.mul(delta));
    }

    markBoundsDirty() {
        if (!this.#boundsDirty) {
            this.#boundsDirty = true;
            this.entity.markBoundsDirty();
        }
    }

    #computeLocalMatrix() {
        const localMatrix = this.#localMatrix;
        localMatrix.identity();

        localMatrix.translateSelf(
            this.#position.x + this.#positionOffset.x,
            this.#position.y + this.#positionOffset.y,
        );
        localMatrix.rotateSelf(this.#rotation);
        localMatrix.scaleSelf(
            this.#scale.x * this.#scaleMult.x,
            this.#scale.y * this.#scaleMult.y,
        );
        this.#localMatrixDirty = false;
        this.#worldMatrixDirty = true;
    }

    #computeWorldMatrix() {
        if (this.entity.parent) {
            this.#worldMatrix =
                this.entity.parent.transform.worldMatrix.multiply(
                    this.localMatrix,
                );
        } else {
            this.#worldMatrix = this.localMatrix.clone();
        }

        this.#boundsDirty = true;
    }

    #computeBoundingBox() {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const comp of this.entity.visualComponents) {
            const compBB = comp.boundingBox;

            this.#corners[0].set({ x: compBB.x1, y: compBB.y1 });
            this.#corners[1].set({ x: compBB.x2, y: compBB.y1 });
            this.#corners[2].set({ x: compBB.x2, y: compBB.y2 });
            this.#corners[3].set({ x: compBB.x1, y: compBB.y2 });

            for (let i = 0; i < 4; i++) {
                const corner = this.#corners[i];
                corner.set(this.worldMatrix.transformPoint(corner));
                minX = Math.min(minX, corner.x);
                maxX = Math.max(maxX, corner.x);
                minY = Math.min(minY, corner.y);
                maxY = Math.max(maxY, corner.y);
            }
        }

        for (const child of this.entity.children) {
            const childBB = child.transform.boundingBox;
            minX = Math.min(minX, childBB.x1);
            maxX = Math.max(maxX, childBB.x2);
            minY = Math.min(minY, childBB.y1);
            maxY = Math.max(maxY, childBB.y2);
        }

        this.#boundingBox.x1 = minX;
        this.#boundingBox.y1 = minY;
        this.#boundingBox.x2 = maxX;
        this.#boundingBox.y2 = maxY;
    }

    #markLocalDirty() {
        this.#localMatrixDirty = true;
        this.markBoundsDirty();

        const entity = this.entity;
        for (const child of entity.children) {
            child.transform.#markWorldDirty();
        }
        if (entity.isVisual()) {
            this._engine.forceRender();
        }
    }

    #markWorldDirty() {
        this.#worldMatrixDirty = true;
        this.markBoundsDirty();
        for (const child of this.entity.children) {
            child.transform.#markWorldDirty();
        }
    }
}
