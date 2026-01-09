import type { IVector } from './vector';

/**
 * A 2D affine transformation matrix
 * Represents the matrix:
 * [ a  c  e ]
 * [ b  d  f ]
 * [ 0  0  1 ]
 */
export class Matrix2D {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;

    constructor(
        a: number = 1,
        b: number = 0,
        c: number = 0,
        d: number = 1,
        e: number = 0,
        f: number = 0,
    ) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
    }

    /**
     * Reset to identity matrix
     */
    identity(): this {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.e = 0;
        this.f = 0;
        return this;
    }

    /**
     * Set matrix values
     */
    set(
        a: number,
        b: number,
        c: number,
        d: number,
        e: number,
        f: number,
    ): this {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
        this.f = f;
        return this;
    }

    /**
     * Copy values from another matrix
     */
    copy(other: Matrix2D): this {
        this.a = other.a;
        this.b = other.b;
        this.c = other.c;
        this.d = other.d;
        this.e = other.e;
        this.f = other.f;
        return this;
    }

    /**
     * Clone this matrix
     */
    clone(): Matrix2D {
        return new Matrix2D(this.a, this.b, this.c, this.d, this.e, this.f);
    }

    /**
     * Translate this matrix by (x, y)
     */
    translateSelf(x: number, y: number): this {
        this.e += this.a * x + this.c * y;
        this.f += this.b * x + this.d * y;
        return this;
    }

    /**
     * Rotate this matrix by angle (in degrees)
     */
    rotateSelf(degrees: number): this {
        const radians = (degrees * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);

        const a = this.a;
        const b = this.b;
        const c = this.c;
        const d = this.d;

        this.a = a * cos + c * sin;
        this.b = b * cos + d * sin;
        this.c = c * cos - a * sin;
        this.d = d * cos - b * sin;

        return this;
    }

    /**
     * Scale this matrix by (sx, sy)
     */
    scaleSelf(sx: number, sy: number = sx): this {
        this.a *= sx;
        this.b *= sx;
        this.c *= sy;
        this.d *= sy;
        return this;
    }

    /**
     * Multiply this matrix by another matrix
     * this = this * other
     */
    multiply(other: Matrix2D): Matrix2D {
        const a = this.a * other.a + this.c * other.b;
        const b = this.b * other.a + this.d * other.b;
        const c = this.a * other.c + this.c * other.d;
        const d = this.b * other.c + this.d * other.d;
        const e = this.a * other.e + this.c * other.f + this.e;
        const f = this.b * other.e + this.d * other.f + this.f;

        return new Matrix2D(a, b, c, d, e, f);
    }

    /**
     * Get the inverse of this matrix
     */
    inverse(): Matrix2D {
        const det = this.a * this.d - this.b * this.c;

        if (det === 0) {
            // Return identity matrix if not invertible
            return new Matrix2D();
        }

        const invDet = 1 / det;

        return new Matrix2D(
            this.d * invDet,
            -this.b * invDet,
            -this.c * invDet,
            this.a * invDet,
            (this.c * this.f - this.d * this.e) * invDet,
            (this.b * this.e - this.a * this.f) * invDet,
        );
    }

    /**
     * Transform a point by this matrix
     */
    transformPoint(point: IVector<number>): IVector<number> {
        return {
            x: this.a * point.x + this.c * point.y + this.e,
            y: this.b * point.x + this.d * point.y + this.f,
        };
    }

    /**
     * Apply this matrix's transform to a canvas context
     */
    applyToContext(ctx: CanvasRenderingContext2D): void {
        ctx.transform(this.a, this.b, this.c, this.d, this.e, this.f);
    }
}
