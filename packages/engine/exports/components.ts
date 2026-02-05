export { Component, type ComponentOptions } from '../src/components';
export {
    type ComponentConstructor,
    type ComponentJSON,
    type CustomComponentJSON,
    createComponentFromJSON,
} from '../src/components/factory';

export {
    C_Transform,
    type C_TransformOptions,
    type C_TransformJSON,
} from '../src/components/transforms';
export {
    C_Lerp,
    type C_LerpOptions,
    type C_LerpJSON,
} from '../src/components/lerp';

export {
    C_Collider,
    type C_ColliderOptions,
} from '../src/components/colliders';
export { C_CircleCollider } from '../src/components/colliders/CircleCollider';
export { C_RectangleCollider } from '../src/components/colliders/RectangleCollider';

export {
    C_Text,
    type C_TextOptions,
    type C_TextJSON,
} from '../src/components/text';
export {
    C_Image,
    type C_ImageOptions,
    type C_ImageJSON,
} from '../src/components/image';
export {
    C_Shape,
    type C_ShapeOptions,
    type C_ShapeJSON,
} from '../src/components/shape';
