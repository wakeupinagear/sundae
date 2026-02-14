import type { AssetSystem } from '..';
import type { BuiltInAssetLoader, IAssetLoader, LoadedAsset } from '../types';

export type AssetLoaderConstructor = AssetLoader | BuiltInAssetLoader;

interface LocalLoadedAsset {
    asset: LoadedAsset;
    src?: string | null;
}

export abstract class AssetLoader implements IAssetLoader {
    #assetSystem: AssetSystem | null = null;
    #loadedAssets: LocalLoadedAsset[] = [];

    setAssetSystem(assetSystem: AssetSystem): void {
        this.#assetSystem = assetSystem;
    }

    abstract loadImage: IAssetLoader['loadImage'];
    abstract loadJSON: IAssetLoader['loadJSON'];

    _loadAsset(asset: LoadedAsset, src?: string | null): void {
        if (this.#assetSystem) {
            this.#assetSystem.onAssetLoaded(asset, src);
        } else {
            this.#loadedAssets.push({ asset, src });
        }
    }
}
