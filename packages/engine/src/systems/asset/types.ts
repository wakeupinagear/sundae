export type AssetType = 'image' | 'json';

interface LoadedAssetBase {
    name: string;
}

type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue };
export type JSONObject = { [key: string]: JSONValue };

export interface LoadedImage extends LoadedAssetBase {
    type: 'image';
    image: HTMLImageElement;
    owned: boolean;
}

export interface LoadedJSON extends LoadedAssetBase {
    type: 'json';
    json: JSONObject;
}

export type LoadedAsset = LoadedImage | LoadedJSON;
