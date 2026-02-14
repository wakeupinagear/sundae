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

    loadImage(name: string, src: string | HTMLImageElement): void {
        this.#loadingAssets.add(name);
        this.#assetLoader.loadImage(name, src);
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

    getImage(name: string): LoadedImage | null {
        return this.#getAsset(name, 'image') as LoadedImage | null;
    }

    getJSON(name: string): LoadedJSON | null {
        return this.#getAsset(name, 'json') as LoadedJSON | null;
    }

    #getAsset(name: string, type: AssetType): LoadedAsset | null {
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

            return asset;
        }

        if (!this.#requestedAssets.has(name)) {
            this.#requestedAssets.add(name);
            switch (type) {
                case 'image':
                    this.#assetLoader.loadImage(name, name);
                    break;
                case 'json':
                    this.#assetLoader.loadJSON(name, name);
                    break;
            }
        }

        return null;
    }
}
