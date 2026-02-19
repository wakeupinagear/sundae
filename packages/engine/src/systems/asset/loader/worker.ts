import { AssetLoader } from '.';
import {
    FromEngineMsgType,
    type ToEngineMsg,
    ToEngineMsgType,
} from '../../../worker';

export class WorkerAssetLoader extends AssetLoader {
    #pendingSvgLoads = new Map<
        string,
        { resolve: (b: ImageBitmap) => void; reject: (err: unknown) => void }
    >();

    override onWorkerMessage({ data }: MessageEvent<ToEngineMsg>): void {
        switch (data.type) {
            case ToEngineMsgType.LOAD_SVG_RESPONSE: {
                const { requestId, imageBitmap } = data;
                const pending = this.#pendingSvgLoads.get(requestId);
                if (pending) {
                    this.#pendingSvgLoads.delete(requestId);
                    imageBitmap
                        ? pending.resolve(imageBitmap)
                        : pending.reject(new Error('Failed to load SVG'));
                }
            }
        }
    }

    _loadRemoteImage = (src: string, name?: string) => {
        if (!this.#startLoading(src)) {
            return;
        }

        const isSvg =
            src.toLowerCase().endsWith('.svg') ||
            src.toLowerCase().includes('.svg?');
        if (isSvg) {
            this.#loadSvg(src, name);
            return;
        } else {
            this.#loadImage(src, name);
        }
    };

    _loadRemoteJSON = (src: string, name?: string) => {
        if (!this.#startLoading(src)) {
            return;
        }
        if (!globalThis.fetch) {
            this.assetSystem?.engine.error(
                'fetch is not supported in this environment',
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
                        this._loadingAssets.delete(src);
                    })
                    .catch(() => {
                        this.assetSystem?.engine.error(
                            `Failed to decode json:`,
                            res,
                        );
                        this._loadingAssets.delete(src);
                    }),
            )
            .catch(() => {
                this.assetSystem?.engine.error('Failed to load json', src);
                this._loadingAssets.delete(src);
            });
    };

    #loadImage = (src: string, name?: string) => {
        if (!globalThis.fetch) {
            this.assetSystem?.engine.error(
                'fetch is not supported in this environment',
            );
            return;
        }
        if (!globalThis.createImageBitmap) {
            this.assetSystem?.engine.error(
                'createImageBitmap is not supported in this environment',
            );
            this._loadingAssets.delete(src);
            return;
        }

        fetch(src)
            .then((res) => res.blob())
            .then((blob) => createImageBitmap(blob))
            .then((imageBitmap) => {
                this._loadAsset({
                    name: name ?? src,
                    type: 'image',
                    image: imageBitmap,
                    owned: true,
                });
                this._loadingAssets.delete(src);
            })
            .catch(() => {
                this.assetSystem?.engine.error(
                    'Failed to load image',
                    name ?? src,
                );
                this._loadingAssets.delete(src);
            });
    };

    #loadSvg = (src: string, name?: string) => {
        new Promise<ImageBitmap>((resolve, reject) => {
            const requestId = crypto.randomUUID();
            this.#pendingSvgLoads.set(requestId, { resolve, reject });
            self.postMessage({
                type: FromEngineMsgType.WORKER_LOAD_SVG_REQUEST,
                src,
                name,
                requestId,
            });
        })
            .then((imageBitmap) => {
                this._loadAsset({
                    name: name ?? src,
                    type: 'image',
                    image: imageBitmap,
                    owned: true,
                });
                this._loadingAssets.delete(src);
            })
            .catch(() => {
                this.assetSystem?.engine.error(
                    'Failed to load image',
                    name ?? src,
                );
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
