import { AssetLoader } from '.';
import type { AssetSystem } from '..';
import type { IAssetLoader } from '../types';

export class BrowserAssetLoader extends AssetLoader {
    #assetSystem: AssetSystem | null = null;
    #loadingAssets: Set<string> = new Set();

    loadImage: IAssetLoader['loadImage'] = (name, src) => {
        if (typeof src === 'string') {
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
                this.#loadingAssets.delete(name);
            };
            image.onerror = () => {
                this.#assetSystem?.engine.error('Failed to load image', name);
                this.#loadingAssets.delete(name);
            };
        } else {
            this._loadAsset({
                name,
                type: 'image',
                image: src,
                owned: false,
            });
        }
    };

    loadJSON: IAssetLoader['loadJSON'] = (name, src) => {
        if (typeof src === 'string') {
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
                            this.#loadingAssets.delete(name);
                        }),
                )
                .catch(() => {
                    this.#assetSystem?.engine.error(
                        'Failed to load json',
                        name,
                    );
                    this.#loadingAssets.delete(name);
                });
        } else if (typeof src === 'object') {
            this._loadAsset({
                name,
                type: 'json',
                json: src,
            });
        }
    };

    #startLoading(name: string) {
        if (this.#loadingAssets.has(name)) {
            return false;
        }

        this.#loadingAssets.add(name);

        return true;
    }
}
