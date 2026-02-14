import type { AssetSystem } from '..';
import type { JSONObject, LoadedAsset } from '../types';

interface LocalLoadedAsset {
    asset: LoadedAsset;
    src?: string | null;
}

export abstract class AssetLoader {
    _loadingAssets: Set<string> = new Set();

    #assetSystem: AssetSystem | null = null;
    #loadedAssets: LocalLoadedAsset[] = [];

    setAssetSystem(assetSystem: AssetSystem): void {
        this.#assetSystem = assetSystem;
    }

    loadImage(name: string, src: string | HTMLImageElement): void {
        if (typeof src === 'string') {
            this._loadRemoteImage(name, src);
        } else {
            this._loadAsset({ name, type: 'image', image: src, owned: false });
        }
    }

    loadJSON(name: string, src: string | JSONObject): void {
        if (typeof src === 'string') {
            this._loadRemoteJSON(name, src);
        } else {
            this._loadAsset({ name, type: 'json', json: src });
        }
    }

    abstract _loadRemoteImage: (name: string, src: string) => void;
    abstract _loadRemoteJSON: (name: string, src: string) => void;

    _loadAsset(asset: LoadedAsset, src?: string | null): void {
        if (this.#assetSystem) {
            this.#assetSystem.onAssetLoaded(asset, src);
        } else {
            this.#loadedAssets.push({ asset, src });
        }
    }
}
