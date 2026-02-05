import { Engine, type Platform } from '@repo/engine';

export const lerp = (from: number, to: number, t: number): number => {
    return from + (to - from) * t;
};
export const zoomToScale = (zoom: number): number => {
    return Math.pow(2, zoom);
};

export const scaleToZoom = (scale: number): number => {
    return Math.log2(scale);
};

export const OPACITY_THRESHOLD = 0.001;

export type EngineConstructor<TEngine extends Engine = Engine> =
    | TEngine
    | (new (options?: Partial<TEngine['options']>) => TEngine)
    | undefined;

export const createEngine = <TEngine extends Engine = Engine>(
    engine: EngineConstructor<TEngine>,
    options?: Partial<TEngine['options']>,
    platform?: Platform,
): TEngine => {
    let engineInstance;
    const engineCtor = engine || Engine;
    if (
        typeof engineCtor === 'function' &&
        engineCtor.prototype &&
        engineCtor.prototype.constructor === engineCtor
    ) {
        const EngineCtor = engineCtor as new (
            options?: Partial<TEngine['options']>,
        ) => TEngine;
        engineInstance = new EngineCtor(options);
    } else {
        engineInstance = engine as TEngine;
        if (options) {
            engineInstance.options = options;
        }
    }

    if (platform) {
        engineInstance.setPlatform(platform);
    }

    return engineInstance;
};
