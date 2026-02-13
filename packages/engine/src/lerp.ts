import type { IVector } from './math/vector';

const SNAP_EPSILON = 1e-6;
const BASELINE_RATE = 0.1;

export type LerpValueType = number | IVector<number>;

export interface LerpOptions<T extends LerpValueType> {
    get: () => T;
    set: (value: T) => void;
    speed?: number;
    baselineRate?: number;
}

export abstract class Lerp<T extends LerpValueType> {
    _get: () => T;
    _set: (value: T) => void;
    _speed: number;
    _baselineRate: number;

    #targetValue: T;

    #settled: boolean = false;

    constructor(options: LerpOptions<T>) {
        this._get = options.get;
        this._set = options.set;
        this._speed = options.speed ?? 1;
        this._baselineRate = options.speed ?? BASELINE_RATE;

        this.#targetValue = this._get();
    }

    get speed(): number {
        return this._speed;
    }

    set speed(speed: number) {
        this._speed = speed;
    }

    get target(): T {
        return this.#targetValue;
    }

    set target(value: T) {
        this.#targetValue = value;
    }

    get settled(): boolean {
        return this.#settled;
    }

    update(deltaTime: number): boolean {
        this.#settled = this._internalUpdate(deltaTime);

        return this.#settled;
    }

    _internalUpdate(deltaTime: number): boolean {
        let currentValue = this._get();
        if (
            typeof currentValue === 'number' &&
            typeof this.#targetValue === 'number'
        ) {
            if (currentValue === this.#targetValue) {
                return false;
            }

            currentValue = this._lerp(
                currentValue,
                this.#targetValue,
                deltaTime,
            ) as T;
        } else if (
            typeof currentValue === 'object' &&
            typeof this.#targetValue === 'object'
        ) {
            const deltaX = this.#targetValue.x - currentValue.x;
            const deltaY = this.#targetValue.y - currentValue.y;
            const distanceToTarget = Math.hypot(deltaX, deltaY);
            if (distanceToTarget <= SNAP_EPSILON) {
                return false;
            }

            const stepDistance = this._lerp(0, distanceToTarget, deltaTime);
            const progress = Math.min(stepDistance / distanceToTarget, 1);

            currentValue = {
                x: currentValue.x + deltaX * progress,
                y: currentValue.y + deltaY * progress,
            } as T;
        }

        this._set(currentValue);

        return true;
    }

    abstract _lerp(current: number, target: number, deltaTime: number): number;
}

export type LinearLerpVariant = 'normal' | 'degrees';

interface LinearLerpOptions<T extends LerpValueType> extends LerpOptions<T> {
    variant?: LinearLerpVariant;
}

export class LinearLerp<T extends LerpValueType> extends Lerp<T> {
    #variant: LinearLerpVariant;

    constructor(options: LinearLerpOptions<T>) {
        super(options);

        this.#variant = options.variant ?? 'normal';
    }

    _lerp(current: number, target: number, deltaTime: number): number {
        if (this.#variant === 'degrees') {
            const startAngle = ((current % 360) + 360) % 360;
            const endAngle = ((target % 360) + 360) % 360;

            let delta = endAngle - startAngle;

            if (delta > 180) {
                delta -= 360;
            } else if (delta < -180) {
                delta += 360;
            }

            const step = deltaTime * this._speed;

            if (step >= Math.abs(delta)) {
                return target;
            }

            const interpolatedAngle = startAngle + step * Math.sign(delta);

            return ((interpolatedAngle % 360) + 360) % 360;
        } else {
            const prevSign = current > target ? 1 : -1;
            const newValue = current - prevSign * deltaTime * this._speed;
            const newSign = newValue > target ? 1 : -1;
            if (prevSign !== newSign) {
                return target;
            }

            return newValue;
        }
    }
}

export class FractionalLerp<T extends LerpValueType> extends Lerp<T> {
    _lerp(current: number, target: number, deltaTime: number): number {
        const mult = deltaTime * this._speed;
        if (mult >= 1) {
            return target;
        }

        const delta = target - current;
        if (Math.abs(delta) <= SNAP_EPSILON) {
            return target;
        }

        let step = delta * mult;
        const minStep = this._baselineRate * deltaTime;
        if (Math.abs(step) < minStep) {
            step = Math.sign(delta) * Math.min(minStep, Math.abs(delta));
        }

        const next = current + step;
        if (
            (delta > 0 && next >= target) ||
            (delta < 0 && next <= target) ||
            Math.abs(target - next) <= SNAP_EPSILON
        ) {
            return target;
        }

        return next;
    }
}
