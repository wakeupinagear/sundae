import fs from 'fs';
import path from 'path';
import { type Canvas, Image } from 'skia-canvas';

import { Engine, type EngineOptions } from '@repo/engine';
import type { IEngineHarness } from '@repo/engine-scenarios';
import { FilesystemAssetLoader } from '@repo/node';

import { createEngine } from '../../engine/src/utils';

const FIXED_DELTA_TIME = 1 / 60;

const WRITE_MODE = process.env.WRITE_SNAPSHOTS === 'true';

const SNAPSHOTS_DIR = path.join(process.cwd(), 'snapshots');
const SNAPSHOTS_BASELINE_DIR = path.join(SNAPSHOTS_DIR, 'baseline');
const SNAPSHOTS_CURRENT_DIR = path.join(SNAPSHOTS_DIR, 'current');

const SNAPSHOT_FILE_TYPE = 'png';

const FILESYSTEM_ASSET_LOADER = new FilesystemAssetLoader({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    imageConstructor: Image as any,
    rootDir: path.resolve(process.cwd(), '../engine-scenarios/assets'),
});

interface SnapshotHarnessOptions {
    testName: string;
    snapshotFolder?: string;
    frameTimeout?: number;
    stylePropertyValuePreloads?: string[];
}

const DARK_MODE_STYLE_PROPERTY_VALUES: Record<string, string> = {
    '--background': '#0f0f1a',
    '--foreground': '#e2e2f5',
    '--card': '#1a1a2e',
    '--border': '#303052',
    '--primary': '#a48fff',
};

export class SnapshotHarness implements IEngineHarness {
    #engine: Engine;
    #canvas: Canvas;
    #testName: string;
    #snapshotFolder: string | undefined;
    #frameTimeout: number;

    #startNextFrame: ((deltaTime: number) => void) | null = null;
    #currentFrame: number = 0;
    #snapshotCount: number = 0;

    constructor(
        canvas: Canvas,
        engineOptions: Partial<EngineOptions>,
        options: SnapshotHarnessOptions,
    ) {
        this.#engine = createEngine(Engine, {
            engineOptions: {
                ...engineOptions,
                now: () => 1433671641000,
                onReadyForNextFrame: (startNextFrame) => {
                    this.#startNextFrame = startNextFrame;
                },
                assetLoadingBehavior: 'block-update',
                assetLoader: FILESYSTEM_ASSET_LOADER,
            },
        });
        this.#engine.setCanvas(canvas);
        const preloads = options?.stylePropertyValuePreloads ?? [];
        if (preloads.length > 0) {
            this.#engine.setCanvasStylePropertyValues(
                Object.fromEntries(
                    preloads.map((property) => [
                        property,
                        DARK_MODE_STYLE_PROPERTY_VALUES[property],
                    ]),
                ),
            );
        }
        this.#canvas = canvas;

        this.#testName = options?.testName;
        this.#snapshotFolder = options?.snapshotFolder;
        this.#frameTimeout = options?.frameTimeout ?? 5000;
    }

    get engine() {
        return this.#engine;
    }

    get snapshotCount() {
        return this.#snapshotCount;
    }

    async step(n = 1) {
        for (let i = 0; i < n; i++) {
            this.#currentFrame++;

            await Promise.race([
                new Promise((resolve) => {
                    const onReadyForNextFrame: EngineOptions['onReadyForNextFrame'] =
                        (startNextFrame) => {
                            this.#startNextFrame = startNextFrame;
                            resolve(true);
                        };
                    this.#engine.options = { onReadyForNextFrame };

                    this.#startNextFrame?.(FIXED_DELTA_TIME);
                }),
                new Promise(() =>
                    setTimeout(() => {
                        throw new Error(
                            `Timeout at frame ${this.#currentFrame} after ${this.#frameTimeout}ms`,
                        );
                    }, this.#frameTimeout),
                ),
            ]);

            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    async snapshot() {
        const imageBuffer = await this.#canvas.toBuffer(SNAPSHOT_FILE_TYPE);

        const folderName =
            this.#snapshotFolder ?? this.#formatTestFolderName(this.#testName);
        const baseDir = WRITE_MODE
            ? SNAPSHOTS_BASELINE_DIR
            : SNAPSHOTS_CURRENT_DIR;
        const folderPath = path.join(baseDir, folderName);

        fs.mkdirSync(folderPath, { recursive: true });
        fs.writeFileSync(
            path.join(
                folderPath,
                `${this.#snapshotCount.toString().padStart(3, '0')}.${SNAPSHOT_FILE_TYPE}`,
            ),
            imageBuffer,
        );

        this.#snapshotCount++;
    }

    #formatTestFolderName(testName: string) {
        const words = testName
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .split('_')
            .filter(Boolean);

        if (words.length === 0) return '';

        return (
            words[0].toLowerCase() +
            words
                .slice(1)
                .map(
                    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
                )
                .join('')
        );
    }
}
