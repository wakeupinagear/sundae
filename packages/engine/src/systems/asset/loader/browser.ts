import { AssetLoader } from '.';
import type { AssetSystem } from '..';

export class BrowserAssetLoader extends AssetLoader {
    #assetSystem: AssetSystem | null = null;

    _loadRemoteImage = (src: string, name?: string) => {
        if (!this.#startLoading(src)) {
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
                name: name ?? src,
                type: 'image',
                image: image,
                owned: true,
            });
            this._loadingAssets.delete(src);
        };
        image.onerror = () => {
            this.#assetSystem?.engine.error('Failed to load image', name);
            this._loadingAssets.delete(src);
        };
    };

    _loadRemoteJSON = (src: string, name?: string) => {
        if (!this.#startLoading(src)) {
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
                            name: name ?? src,
                        });
                    })
                    .catch(() => {
                        this.#assetSystem?.engine.error(
                            `Failed to decode json:`,
                            res,
                        );
                        this._loadingAssets.delete(src);
                    }),
            )
            .catch(() => {
                this.#assetSystem?.engine.error('Failed to load json', src);
                this._loadingAssets.delete(src);
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
