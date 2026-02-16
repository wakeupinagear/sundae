import type { SignalSystem } from '.';
import type { Engine } from '../../engine';

export type SignalValueFormat = 'default' | 'string' | 'number' | 'boolean';

export type ToStringFunction<T> = (value: T) => string;
export type ToNumberFunction<T> = (value: T) => number;
export type ToBooleanFunction<T> = (value: T) => boolean;

interface SignalOptions<T> {
    stringFormatter?: ToStringFunction<T>;
    numberFormatter?: ToNumberFunction<T>;
    booleanFormatter?: ToBooleanFunction<T>;
}

export const defaultNumberStringFormatter: ToStringFunction<number> = (
    value: number,
) => value.toFixed(2);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class SignalVariable<T = any> {
    #name: string;
    #value: T;

    #options: SignalOptions<T>;

    #signalSystem: SignalSystem;

    constructor(
        name: string,
        startingValue: T,
        engine: Engine,
        options?: SignalOptions<T>,
    ) {
        this.#name = name;
        this.#value = startingValue;
        this.#options = options ?? {};

        this.#signalSystem = engine.signalSystem;
        this.#signalSystem.registerSignal(this);
    }

    destroy(): void {
        this.#signalSystem.unregisterSignal(this);
    }

    get name(): string {
        return this.#name;
    }

    get(format: 'string'): string;
    get(format: 'number'): number;
    get(format: 'boolean'): boolean;
    get(format?: 'default'): T;
    get(format?: SignalValueFormat): string | number | boolean | T {
        switch (format) {
            case 'string':
                return (
                    this.#options.stringFormatter?.(this.#value) ??
                    String(this.#value)
                );
            case 'number':
                return (
                    this.#options.numberFormatter?.(this.#value) ??
                    Number(this.#value)
                );
            case 'boolean':
                return (
                    this.#options.booleanFormatter?.(this.#value) ??
                    Boolean(this.#value)
                );
            default:
                return this.#value;
        }
    }

    set(newValue: T): void {
        if (newValue !== this.#value) {
            this.#value = newValue;
            this.#signalSystem.onSignalUpdated(this.#name);
        }
    }
}
