export type AssetType = 'image' | 'json';

interface LoadedAssetBase {
    name: string;
}

export type ImageSource = string | HTMLImageElement;

type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | { [key: string]: JSONValue };
type JSONObject = { [key: string]: JSONValue };
export type JSONSource = string | JSONObject;

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
