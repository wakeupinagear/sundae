import { AssetLoader } from '.';
import type { AssetSystem } from '..';

export class BrowserAssetLoader extends AssetLoader {
    #assetSystem: AssetSystem | null = null;

    _loadRemoteImage = (name: string, src: string) => {
        if (!this.#startLoading(name)) {
            return;
        }
        if (!globalThis.Image) {
            this.#assetSystem?.engine.error(
                'Image is not supported in this environment',
            );
            return;
        }

        const image = new globalThis.Image();
        image.src = src;
        image.onload = () => {
            this._loadAsset({
                name,
                type: 'image',
                image: image,
                owned: true,
            });
            this._loadingAssets.delete(name);
        };
        image.onerror = () => {
            this.#assetSystem?.engine.error('Failed to load image', name);
            this._loadingAssets.delete(name);
        };
    };

    _loadRemoteJSON = (name: string, src: string) => {
        if (!this.#startLoading(name)) {
            return;
        }
        if (!globalThis.fetch) {
            this.#assetSystem?.engine.error(
                'Image is not supported in this environment',
            );
            return;
        }

        fetch(src, {
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then((res) =>
                res
                    .json()
                    .then((json) => {
                        this._loadAsset({
                            type: 'json',
                            json,
                            name,
                        });
                    })
                    .catch(() => {
                        this.#assetSystem?.engine.error(
                            `Failed to decode json:`,
                            res,
                        );
                        this._loadingAssets.delete(name);
                    }),
            )
            .catch(() => {
                this.#assetSystem?.engine.error('Failed to load json', name);
                this._loadingAssets.delete(name);
            });
    };

    #startLoading(name: string) {
        if (this._loadingAssets.has(name)) {
            return false;
        }

        this._loadingAssets.add(name);

        return true;
    }
}
