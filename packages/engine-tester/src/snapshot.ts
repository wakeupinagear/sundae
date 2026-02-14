import fs from 'fs';
import path from 'path';
import { Canvas, Image } from 'skia-canvas';
import { test } from 'vitest';

import { Engine, type EngineOptions } from '@repo/engine';
import type { EngineScenario, IEngineHarness } from '@repo/engine-scenarios';
import { FilesystemAssetLoader } from '@repo/node';

const WRITE_MODE = process.env.WRITE_SNAPSHOTS === 'true';

const SNAPSHOTS_DIR = path.join(process.cwd(), 'snapshots');
const SNAPSHOTS_BASELINE_DIR = path.join(SNAPSHOTS_DIR, 'baseline');
const SNAPSHOTS_CURRENT_DIR = path.join(SNAPSHOTS_DIR, 'current');

const SNAPSHOT_FILE_TYPE = 'png';
const SNAPSHOT_FILE_TYPE_REGEX = new RegExp(
    `^data:image/${SNAPSHOT_FILE_TYPE};base64,`,
);

const FILESYSTEM_ASSET_LOADER = new FilesystemAssetLoader({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    imageConstructor: Image as any,
    rootDir: path.resolve(process.cwd(), '../engine-scenarios/assets'),
});

interface SnapshotHarnessOptions {
    testName: string;
    frameTimeout?: number;
}

class SnapshotHarness implements IEngineHarness {
    #engine: Engine;
    #canvas: Canvas;
    #testName: string;
    #frameTimeout: number;

    #startNextFrame: (() => void) | null = null;
    #currentFrame: number = 0;
    #snapshotCount: number = 0;

    constructor(
        canvas: Canvas,
        engineOptions: Partial<EngineOptions>,
        options: SnapshotHarnessOptions,
    ) {
        this.#engine = new Engine({
            ...engineOptions,
            onReadyForNextFrame: (startNextFrame) => {
                this.#startNextFrame = startNextFrame;
            },
            assetLoadingBehavior: 'block-update',
            assetLoader: FILESYSTEM_ASSET_LOADER,
        });
        this.#engine.setCanvas(canvas);
        this.#canvas = canvas;

        this.#testName = options?.testName;
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

                    this.#startNextFrame?.();
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

    snapshot() {
        const dataURL = this.#canvas.toDataURL(SNAPSHOT_FILE_TYPE, 1);
        const base64Data = dataURL.replace(SNAPSHOT_FILE_TYPE_REGEX, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const folderName = this.#formatTestFolderName(this.#testName);
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
        return testName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }
}

interface SnapshotTestOptions {
    canvas?: Canvas;
}

export function defineSnapshotTest(
    name: string,
    fn: EngineScenario,
    options: SnapshotTestOptions,
) {
    const canvas: Canvas = options.canvas ?? new Canvas(800, 600);

    test(name, async () => {
        const harness = new SnapshotHarness(canvas, {}, { testName: name });
        await fn(harness);
        if (harness.snapshotCount === 0) {
            await harness.step(12);
            harness.snapshot();
        }
    });
}
