import { type Engine } from '../../engine';
import { System } from '../index';
import type { AssetLoader } from './loader';
import { BrowserAssetLoader } from './loader/browser';
import type { AssetType, LoadedAsset, LoadedImage, LoadedJSON } from './types';

export class AssetSystem<
    TEngine extends Engine = Engine,
> extends System<TEngine> {
    public static typeString: string = 'AssetSystem';

    #assetLoader: AssetLoader;

    #loadingAssets: Set<string> = new Set();
    #loadedAssets: Record<string, LoadedAsset> = {};
    #pathsToLoadedAssets: Record<string, string> = {};

    #requestedAssets: Set<string> = new Set();
    #requestedAssetJustLoaded: boolean = false;

    constructor(engine: TEngine, assetLoader: AssetLoader | null) {
        super(engine);

        this.#assetLoader = assetLoader || new BrowserAssetLoader();
        this.#assetLoader.setAssetSystem(this);
    }

    override get typeString(): string {
        return AssetSystem.typeString;
    }

    getLoadingAssets(): string[] {
        return Array.from(this.#loadingAssets);
    }

    override lateUpdate(): boolean {
        if (this.#requestedAssetJustLoaded) {
            this.#requestedAssetJustLoaded = false;
            return true;
        }

        return this.#requestedAssets.size > 0;
    }

    destroy(): void {
        this.#loadingAssets.clear();
        this.#loadedAssets = {};
        this.#requestedAssets.clear();
    }

    onAssetLoaded(asset: LoadedAsset, src?: string | null): void {
        const { name } = asset;
        this.#loadedAssets[name] = { ...asset };

        this.#loadingAssets.delete(name);
        if (this.#requestedAssets.has(name)) {
            this.#requestedAssets.delete(name);
            this.#requestedAssetJustLoaded = true;
        }

        if (src) {
            this.#pathsToLoadedAssets[src] = name;
            if (this.#requestedAssets.has(src)) {
                this.#requestedAssets.delete(src);
                this.#requestedAssetJustLoaded = true;
            }
        }
    }

    requestAsset(src: string, type: AssetType, name?: string): void {
        if (type === 'image') {
            this.requestImage(src, name);
        } else if (type === 'json') {
            this.requestJSON(src, name);
        }
    }

    getImage(src: string, name?: string): LoadedImage | null {
        const existingAsset = this.#getAsset<LoadedImage>(name ?? src, 'image');
        if (existingAsset) {
            return existingAsset;
        }

        this.requestImage(src, name);

        return null;
    }

    requestImage(src: string, name?: string): void {
        if (!this.#requestedAssets.has(src)) {
            this.#requestedAssets.add(src);
            this.#assetLoader.loadImage(src, name);
        }
    }

    getJSON(src: string, name?: string): LoadedJSON | null {
        const existingAsset = this.#getAsset<LoadedJSON>(name ?? src, 'json');
        if (existingAsset) {
            return existingAsset;
        }

        this.requestJSON(src, name);

        return null;
    }

    requestJSON(src: string, name?: string): void {
        if (!this.#requestedAssets.has(src)) {
            this.#requestedAssets.add(src);
            this.#assetLoader.loadJSON(src, name);
        }
    }

    #getAsset<T extends LoadedAsset>(name: string, type: T['type']): T | null {
        let asset: LoadedAsset | null = null;
        const imageByName = this.#loadedAssets[name];
        if (imageByName) {
            asset = imageByName;
        } else {
            const path = this.#pathsToLoadedAssets[name];
            if (path) {
                const assetByPath = this.#loadedAssets[path];
                if (assetByPath) {
                    asset = assetByPath;
                }
            }
        }

        if (asset) {
            if (asset.type !== type) {
                this._engine.error(`Asset ${name} is not of type ${type}`);
                return null;
            }

            return asset as T;
        }

        return null;
    }
}
