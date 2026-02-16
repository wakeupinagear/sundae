import { System } from '..';
import type { Engine } from '../../engine';
import type { SignalValueFormat, SignalVariable } from './variable';

const TEMPLATE_REGEX = /\{\{\s*([a-zA-Z0-9_.$:]+)\s*\}\}/g;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OnSignalUpdatedCB<T = any> = (newValue: T) => boolean | void;

interface SignalRecord {
    variable: SignalVariable;
    callbacks: Record<string, OnSignalUpdatedCB>;
}

export type GetSignalValueReturn<
    T,
    F extends SignalValueFormat,
> = F extends 'string' ? string : F extends 'number' ? number : T;

export interface ISignalSubscriber {
    getSignalValue<T, F extends SignalValueFormat = 'default'>(
        signalName: string,
        fallback: T,
        format?: F,
    ): GetSignalValueReturn<T, F>;

    subscribeToSignal<T>(
        id: string,
        signalName: string,
        cb: OnSignalUpdatedCB<T>,
    ): void;
    unsubscribeFromSignal(id: string, signalName: string): void;
    unsubscribeFromAllSignals(id: string): void;
}

export class SignalSystem<
    TEngine extends Engine = Engine,
> extends System<TEngine> {
    #signals: Map<string, SignalRecord> = new Map();
    #updatedVariables: Set<string> = new Set();
    #signalSubscribers: Map<string, Set<string>> = new Map();

    static getSignalsInText(text: string): Set<string> {
        const signals = new Set<string>();
        let match: RegExpExecArray | null;
        while ((match = TEMPLATE_REGEX.exec(text)) !== null) {
            signals.add(match[1]);
        }

        return signals;
    }

    static formatSignalTemplates(
        text: string,
        getSignalValue: ISignalSubscriber['getSignalValue'],
    ): string {
        return text.replace(TEMPLATE_REGEX, (_, signal) => {
            const splitByColon = signal.split(':');
            const signalName = splitByColon[0];
            const format = splitByColon[1] ?? 'string';

            return String(getSignalValue(signalName, '', format));
        });
    }

    override earlyUpdate(): boolean {
        return this.#broadcastSignalUpdates();
    }

    override lateUpdate(): boolean {
        return this.#broadcastSignalUpdates();
    }

    getSignalValue = (<T, F extends SignalValueFormat = 'default'>(
        signalName: string,
        fallback: T,
        format?: F,
    ): GetSignalValueReturn<T, F> => {
        const signal = this.#signals.get(signalName);
        if (!signal) {
            this._engine.error('Signal does not exist:', signalName);
            return fallback as GetSignalValueReturn<T, F>;
        }

        const fmt = format ?? 'default';
        if (fmt === 'string')
            return signal.variable.get('string') as GetSignalValueReturn<T, F>;
        if (fmt === 'number')
            return signal.variable.get('number') as GetSignalValueReturn<T, F>;
        if (fmt === 'boolean')
            return signal.variable.get('boolean') as GetSignalValueReturn<T, F>;
        return signal.variable.get() as GetSignalValueReturn<T, F>;
    }) as ISignalSubscriber['getSignalValue'];

    subscribeToSignal: ISignalSubscriber['subscribeToSignal'] = (
        id,
        signalName,
        cb,
    ) => {
        const signal = this.#signals.get(signalName);
        if (!signal) {
            this._engine.error('Signal does not exist:', signalName);
            return;
        }

        signal.callbacks[id] = cb;

        const subscriber = this.#signalSubscribers.get(id);
        if (!subscriber) {
            this.#signalSubscribers.set(id, new Set(signalName));
        } else {
            subscriber.add(signalName);
        }

        cb(signal.variable.get());
    };

    unsubscribeFromSignal: ISignalSubscriber['unsubscribeFromSignal'] = (
        id,
        signalName,
    ) => {
        this.#removeCallback(id, signalName);

        const subscriber = this.#signalSubscribers.get(id);
        if (subscriber) {
            subscriber.delete(signalName);
        } else {
            this._engine.error('Signal subscriber', id, 'never subscribed');
        }
    };

    unsubscribeFromAllSignals: ISignalSubscriber['unsubscribeFromAllSignals'] =
        (id) => {
            const subscriber = this.#signalSubscribers.get(id);
            if (subscriber) {
                for (const signalName in subscriber) {
                    this.#removeCallback(id, signalName);
                }
                this.#signalSubscribers.delete(id);
            }
        };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerSignal(variable: SignalVariable<any>): void {
        if (this.#signals.has(variable.name)) {
            this._engine.error('Signal name must be unique:', variable.name);
            return;
        }

        this.#signals.set(variable.name, { variable, callbacks: {} });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unregisterSignal(variable: SignalVariable<any>): void {
        if (!this.#signals.has(variable.name)) {
            this._engine.error(
                'Signal name not previously registered:',
                variable.name,
            );
            return;
        }

        this.#signals.delete(variable.name);
    }

    onSignalUpdated(name: string): void {
        this.#updatedVariables.add(name);
    }

    #removeCallback(id: string, signalName: string) {
        const signal = this.#signals.get(signalName);
        if (!signal) {
            this._engine.error('Signal does not exist:', signalName);
            return;
        }

        delete signal.callbacks[id];
    }

    #broadcastSignalUpdates(): boolean {
        let updated = false;
        for (const signal of this.#signals.values()) {
            const callbacks = Object.values(signal.callbacks);
            if (callbacks.length > 0) {
                const updatedValue = signal.variable.get();
                for (const cb of callbacks) {
                    if (cb(updatedValue)) {
                        updated = true;
                    }
                }
            }
        }
        this.#updatedVariables.clear();

        return updated;
    }
}
