import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AssetLoader, type JSONObject } from '@repo/engine/asset';

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
                .replace(/\\/g, '/')
                .match(/(?:^|\/)scenario-assets\/(.+)$/)?.[1] ?? null;
        if (scenarioAssetPath) {
            return path.resolve(rootDir, scenarioAssetPath);
        }

        if (path.isAbsolute(src)) {
            return src;
        }

        return path.resolve(rootDir, src);
    }

    _loadRemoteImage = (name: string, src: string) => {
        if (!this.#startLoading(name)) {
            return;
        }

        void this.#readImage(name, src).catch((error) => {
            console.error(`Failed to load image asset "${src}"`, error);
        });
    };

    _loadRemoteJSON = (name: string, src: string) => {
        if (!this.#startLoading(name)) {
            return;
        }

        void this.#readJSON(name, src).catch((error) => {
            console.error(`Failed to load JSON asset "${src}"`, error);
        });
    };

    async #readImage(name: string, src: string): Promise<void> {
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
                    owned: true,
                },
                src,
            );
        } finally {
            this._loadingAssets.delete(name);
        }
    }

    async #readJSON(name: string, src: string): Promise<void> {
        try {
            const resolvedPath = FilesystemAssetLoader.resolveAssetPath(
                src,
                this.#rootDir,
            );
            const fileContents = await readFile(resolvedPath, 'utf8');

            this._loadAsset(
                {
                    type: 'json',
                    json: JSON.parse(fileContents) as JSONObject,
                    name,
                },
                src,
            );
        } finally {
            this._loadingAssets.delete(name);
        }
    }

    #startLoading(name: string): boolean {
        if (this._loadingAssets.has(name)) {
            return false;
        }

        this._loadingAssets.add(name);

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
