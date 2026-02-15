import type { AssetSystem } from '..';
import type { ToEngineMsg } from '../../../worker';
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

    protected get assetSystem(): AssetSystem | null {
        return this.#assetSystem;
    }

    loadImage(src: ImageSource, name?: string): LoadedImage | null {
        if (typeof src === 'string') {
            this._loadRemoteImage(src, name);

            return null;
        } else {
            return this._loadAsset({
                name: name ?? ('src' in src ? src.src : ''),
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onWorkerMessage(event: MessageEvent<ToEngineMsg>): void {}

    _loadAsset<T extends LoadedAsset>(asset: T, src?: string | null): T {
        if (this.#assetSystem) {
            this.#assetSystem.onAssetLoaded(asset, src);
        } else {
            this.#loadedAssets.push({ asset, src });
        }

        return asset;
    }
}
