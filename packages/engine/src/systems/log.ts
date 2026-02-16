import type { Engine } from '../engine';
import { System } from './index';
import { SignalSystem } from './signal';

const LOG_PREFIX = '[LOG]';
const WARN_PREFIX = '[WARN]';
const ERROR_PREFIX = '[ERROR]';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogArgs = any[];

export interface I_LogSystem {
    log: (...args: LogArgs) => void;
    warn: (...args: LogArgs) => void;
    error: (...args: LogArgs) => void;
    logBeforeFrame: (n: number, ...args: LogArgs) => void;
    warnBeforeFrame: (n: number, ...args: LogArgs) => void;
    errorBeforeFrame: (n: number, ...args: LogArgs) => void;
}

export interface LogOutput {
    log: (...args: LogArgs) => void;
    warn: (...args: LogArgs) => void;
    error: (...args: LogArgs) => void;
}

export class LogSystem<TEngine extends Engine = Engine>
    extends System<TEngine>
    implements I_LogSystem
{
    public static typeString: string = 'LogSystem';

    #logOutput: LogOutput | null = null;

    override get typeString(): string {
        return LogSystem.typeString;
    }

    set logOutput(logOutput: LogOutput | null | undefined) {
        this.#logOutput = logOutput ?? null;
    }

    log: I_LogSystem['log'] = (...args) => {
        this.#logOutput?.log?.(LOG_PREFIX, ...this.#processArgs(args));
    };

    warn: I_LogSystem['warn'] = (...args) => {
        this.#logOutput?.warn?.(WARN_PREFIX, ...this.#processArgs(args));
    };

    error: I_LogSystem['error'] = (...args) => {
        this.#logOutput?.error?.(ERROR_PREFIX, ...this.#processArgs(args));
    };

    logBeforeFrame: I_LogSystem['logBeforeFrame'] = (n, ...args) => {
        if (this._engine.frameCount < n) {
            this.#logOutput?.log(LOG_PREFIX, ...this.#processArgs(args));
        }
    };

    warnBeforeFrame: I_LogSystem['warnBeforeFrame'] = (n, ...args) => {
        if (this._engine.frameCount < n) {
            this.#logOutput?.warn(WARN_PREFIX, ...this.#processArgs(args));
        }
    };

    errorBeforeFrame: I_LogSystem['errorBeforeFrame'] = (n, ...args) => {
        if (this._engine.frameCount < n) {
            this.#logOutput?.error(ERROR_PREFIX, ...this.#processArgs(args));
        }
    };

    #processArgs(args: LogArgs): LogArgs {
        return args.map((arg) => {
            if (typeof arg === 'string') {
                return SignalSystem.formatSignalTemplates(
                    arg,
                    this._engine.getSignalValue,
                );
            }

            return arg;
        });
    }
}
