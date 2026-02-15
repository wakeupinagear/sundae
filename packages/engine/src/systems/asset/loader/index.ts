import type { AssetSystem } from '..';
import type {
    ImageSource,
    JSONSource,
    LoadedAsset,
    LoadedImage,
    LoadedJSON,
} from '../types';

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

    loadImage(src: ImageSource, name?: string): LoadedImage | null {
        if (typeof src === 'string') {
            this._loadRemoteImage(src, name);

            return null;
        } else {
            return this._loadAsset({
                name: name ?? src.src,
                type: 'image',
                image: src,
                owned: false,
            });
        }
    }

    loadJSON(src: JSONSource, name?: string): LoadedJSON | null {
        if (typeof src === 'string') {
            this._loadRemoteJSON(src, name);

            return null;
        } else {
            return this._loadAsset({
                name: name ?? '',
                type: 'json',
                json: src,
            });
        }
    }

    abstract _loadRemoteImage: (src: string, name?: string) => void;
    abstract _loadRemoteJSON: (src: string, name?: string) => void;

    _loadAsset<T extends LoadedAsset>(asset: T, src?: string | null): T {
        if (this.#assetSystem) {
            this.#assetSystem.onAssetLoaded(asset, src);
        } else {
            this.#loadedAssets.push({ asset, src });
        }

        return asset;
    }
}
