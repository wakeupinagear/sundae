import { type Engine } from '../engine';
import {
    FractionalLerp,
    type Lerp,
    type LerpOptions,
    type LerpValueType,
    LinearLerp,
    type LinearLerpVariant,
} from '../lerp';
import { type IVector } from '../math/vector';
import { Component, type ComponentOptions } from './index';

type LerpType = 'linear' | 'fractional';

export interface C_LerpOptions<T extends LerpValueType>
    extends ComponentOptions,
        LerpOptions<T> {
    variant?: LinearLerpVariant;
    lerpType?: LerpType;
}

abstract class C_LerpBase<
    TEngine extends Engine = Engine,
    T extends LerpValueType = LerpValueType,
> extends Component<TEngine> {
    _lerp: Lerp<T>;

    constructor(options: C_LerpOptions<T>) {
        const { name = 'lerp', ...rest } = options;
        super({ name, ...rest });

        this._lerp =
            options.lerpType === 'fractional'
                ? new FractionalLerp(options)
                : new LinearLerp(options);
    }

    get speed(): number {
        return this._lerp.speed;
    }

    set speed(speed: number) {
        this._lerp.speed = Math.max(speed, 0);
    }

    get target(): T {
        return this._lerp.target;
    }

    set target(value: T) {
        this._lerp.target = value;
    }

    get settled(): boolean {
        return this._lerp.settled;
    }

    override update(deltaTime: number): boolean {
        return this._lerp.update(deltaTime);
    }
}

export interface C_LerpJSON extends C_LerpOptions<number> {
    type: 'lerp';
}

export class C_Lerp<TEngine extends Engine = Engine> extends C_LerpBase<
    TEngine,
    number
> {
    public static typeString: string = 'C_Lerp';

    constructor(options: C_LerpOptions<number>) {
        super(options);
    }

    override get typeString(): string {
        return C_Lerp.typeString;
    }
}

interface C_LerpOpacityOptions
    extends Omit<C_LerpOptions<number>, 'get' | 'set'> {
    target: { opacity?: number; setOpacity?: (value: number) => void };
}

export interface C_LerpOpacityJSON extends C_LerpOpacityOptions {
    type: 'lerpOpacity';
}

export class C_LerpOpacity<TEngine extends Engine = Engine> extends C_LerpBase<
    TEngine,
    number
> {
    public static typeString: string = 'C_LerpOpacity';

    constructor(options: C_LerpOpacityOptions) {
        const { name = 'opacity_lerp', target, ...rest } = options;
        super({
            name,
            get: () => target.opacity ?? 0,
            set: (value: number) => {
                if (target.setOpacity) {
                    target.setOpacity(value);
                } else {
                    target.opacity = value;
                }
            },
            ...rest,
        });
    }

    override get typeString(): string {
        return C_LerpOpacity.typeString;
    }
}

interface C_PositionLerpOptions<V extends IVector<number>>
    extends Omit<C_LerpOptions<V>, 'get' | 'set'> {
    target: { position: V; setPosition?: (value: V) => void };
}

export interface C_LerpPositionJSON<V extends IVector<number> = IVector<number>>
    extends C_PositionLerpOptions<V> {
    type: 'lerpPosition';
}

export class C_LerpPosition<
    TEngine extends Engine = Engine,
    V extends IVector<number> = IVector<number>,
> extends C_LerpBase<TEngine, V> {
    public static typeString: string = 'C_LerpPosition';

    constructor(options: C_PositionLerpOptions<V>) {
        const {
            name = 'position_lerp',
            target,
            lerpType = 'fractional',
            ...rest
        } = options;
        super({
            name,
            get: () => target.position,
            set: (value: V) => {
                if (target.setPosition) {
                    target.setPosition(value);
                } else {
                    target.position = value;
                }
            },
            lerpType,
            ...rest,
        });
    }

    override get typeString(): string {
        return C_LerpPosition.typeString;
    }
}

interface C_RotationLerpOptions
    extends Omit<C_LerpOptions<number>, 'get' | 'set'> {
    target: { rotation: number; setRotation?: (value: number) => void };
}

export interface C_LerpRotationJSON extends C_RotationLerpOptions {
    type: 'lerpRotation';
}

export class C_LerpRotation<TEngine extends Engine = Engine> extends C_LerpBase<
    TEngine,
    number
> {
    public static typeString: string = 'C_LerpRotation';

    constructor(options: C_RotationLerpOptions) {
        const {
            name = 'rotation_lerp',
            variant = 'degrees',
            target,
            ...rest
        } = options;
        super({
            name,
            get: () => target.rotation,
            set: (value: number) => {
                if (target.setRotation) {
                    target.setRotation(value);
                } else {
                    target.rotation = value;
                }
            },
            variant,
            ...rest,
        });
    }

    override get typeString(): string {
        return C_LerpRotation.typeString;
    }
}
