export { Component, type ComponentOptions } from '../components';
export {
    type ComponentConstructor,
    type ComponentJSON,
    type CustomComponentJSON,
    createComponentFromJSON,
} from '../components/factory';

export { C_Transform, type C_TransformOptions, type C_TransformJSON } from '../components/transforms';
export { C_PointerTarget, type C_PointerTargetOptions, type C_PointerTargetJSON } from '../components/pointerTarget';
export { C_Lerp, type C_LerpOptions, type C_LerpJSON } from '../components/lerp';

export { C_Text, type C_TextOptions, type C_TextJSON } from '../objects/text';
export { C_Image, type C_ImageOptions, type C_ImageJSON } from '../objects/image';
export { C_Shape, type C_ShapeOptions, type C_ShapeJSON } from '../objects/shape';
