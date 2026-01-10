import {
    Component,
    type ComponentOptions,
    type InternalComponentOptions,
} from '.';
import type { Engine } from '../engine';
import { C_Image, C_ImageJSON } from '../objects/image';
import { C_Shape, C_ShapeJSON } from '../objects/shape';
import { C_Text, C_TextJSON } from '../objects/text';
import {
    C_Lerp,
    C_LerpJSON,
    C_LerpOpacity,
    C_LerpOpacityJSON,
    C_LerpPosition,
    C_LerpPositionJSON,
    C_LerpRotation,
    C_LerpRotationJSON,
} from './lerp';
import { C_PointerTarget, C_PointerTargetJSON } from './pointerTarget';
import { C_Transform, C_TransformJSON } from './transforms';

export { Component };
export type { ComponentOptions };

export type ComponentJSON =
    | C_TransformJSON
    | C_TextJSON
    | C_ShapeJSON
    | C_ImageJSON
    | C_PointerTargetJSON
    | C_LerpJSON
    | C_LerpPositionJSON
    | C_LerpOpacityJSON
    | C_LerpRotationJSON
    | C_LerpRotationJSON;

export function createComponentFromJSON<TEngine extends Engine = Engine>(
    json: ComponentJSON & InternalComponentOptions<TEngine>,
): Component<TEngine> {
    switch (json.type) {
        case 'text':
            return new C_Text<TEngine>(json);
        case 'shape':
            return new C_Shape<TEngine>(json);
        case 'image':
            return new C_Image<TEngine>(json);
        case 'lerp':
            return new C_Lerp<TEngine>(json);
        case 'lerpOpacity':
            return new C_LerpOpacity<TEngine>(json);
        case 'lerpPosition':
            return new C_LerpPosition<TEngine>(json);
        case 'lerpRotation':
            return new C_LerpRotation<TEngine>(json);
        case 'pointerTarget':
            return new C_PointerTarget<TEngine>(json);
        case 'transform':
            return new C_Transform<TEngine>(json);
        default:
            throw new Error('Unknown component type');
    }
}
