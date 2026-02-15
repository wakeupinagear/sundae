import type { SignalSystem } from '.';
import type { Engine } from '../../engine';

export type SignalValueFormat = 'default' | 'string' | 'number';

type ToStringFunction<T> = (value: T) => string;
type ToNumberFunction<T> = (value: T) => number;

interface SignalOptions<T> {
    stringFormatter?: ToStringFunction<T>;
    numberFormatter?: ToNumberFunction<T>;
}

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
    get(format?: 'default'): T;
    get(format?: SignalValueFormat): string | number | T {
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
