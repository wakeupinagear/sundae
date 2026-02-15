export type AssetType = 'image' | 'json';

export interface AssetPreload {
    src: string;
    type: AssetType;
    name?: string;
}

interface LoadedAssetBase {
    name: string;
}

type Image = HTMLImageElement | ImageBitmap;
export type ImageSource = string | Image;

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
    image: Image;
    owned: boolean;
}

export interface LoadedJSON extends LoadedAssetBase {
    type: 'json';
    json: JSONObject;
}

export type LoadedAsset = LoadedImage | LoadedJSON;
