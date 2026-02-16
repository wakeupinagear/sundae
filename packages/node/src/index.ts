import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AssetLoader } from '@repo/engine/asset';

const FILE_SLASH_REGEX = /\\/g;
const SCENARIO_ASSETS_REGEX = /(?:^|\/)scenario-assets\/(.+)$/;

interface ImageLike {
    src: string | URL | Buffer;
    onload: (() => void) | null;
    onerror: ((error: unknown) => void) | null;
}

type ImageConstructor = new () => ImageLike;
type LoadImageFn = (src: string) => Promise<HTMLImageElement>;

export interface FilesystemAssetLoaderOptions {
    imageConstructor: ImageConstructor;
    rootDir?: string;
    loadImage?: LoadImageFn;
}

export class FilesystemAssetLoader extends AssetLoader {
    #imageConstructor: ImageConstructor;
    #rootDir: string;
    #loadImageFn: LoadImageFn;

    constructor(options: FilesystemAssetLoaderOptions) {
        super();

        this.#imageConstructor = options.imageConstructor;
        this.#rootDir = options.rootDir ?? process.cwd();
        this.#loadImageFn = options.loadImage ?? this.#loadImage;
    }

    static resolveAssetPath(src: string, rootDir: string): string {
        if (src.startsWith('file://')) {
            return fileURLToPath(src);
        }

        const scenarioAssetPath =
            src
                .replace(FILE_SLASH_REGEX, '/')
                .match(SCENARIO_ASSETS_REGEX)?.[1] ?? null;
        if (scenarioAssetPath) {
            return path.resolve(rootDir, scenarioAssetPath);
        }
        if (path.isAbsolute(src)) {
            return src;
        }

        return path.resolve(rootDir, src);
    }

    _loadRemoteImage = (src: string, name?: string) => {
        if (!this.#startLoading(src)) {
            return;
        }

        void this.#readImage(src, name ?? src).catch((error) => {
            console.error(`Failed to load image asset "${src}"`, error);
        });
    };

    _loadRemoteJSON = (src: string, name?: string) => {
        if (!this.#startLoading(src)) {
            return;
        }

        void this.#readJSON(src, name ?? src).catch((error) => {
            console.error(`Failed to load JSON asset "${src}"`, error);
        });
    };

    async #readImage(src: string, name: string): Promise<void> {
        try {
            const resolvedPath = FilesystemAssetLoader.resolveAssetPath(
                src,
                this.#rootDir,
            );
            const image = await this.#loadImageFn(resolvedPath);

            this._loadAsset(
                {
                    name,
                    type: 'image',
                    image,
                    owned: false,
                },
                src,
            );
        } finally {
            this._loadingAssets.delete(src);
        }
    }

    async #readJSON(src: string, name: string): Promise<void> {
        try {
            const resolvedPath = FilesystemAssetLoader.resolveAssetPath(
                src,
                this.#rootDir,
            );
            const fileContents = await readFile(resolvedPath, 'utf8');

            this._loadAsset(
                {
                    type: 'json',
                    json: JSON.parse(fileContents),
                    name,
                },
                src,
            );
        } finally {
            this._loadingAssets.delete(src);
        }
    }

    #startLoading(src: string): boolean {
        if (this._loadingAssets.has(src)) {
            return false;
        }

        this._loadingAssets.add(src);

        return true;
    }

    #loadImage: LoadImageFn = (src: string) =>
        new Promise((resolve, reject) => {
            const image = new this.#imageConstructor();
            image.onload = () => resolve(image as unknown as HTMLImageElement);
            image.onerror = (error) => reject(error);
            image.src = src;
        });
}
