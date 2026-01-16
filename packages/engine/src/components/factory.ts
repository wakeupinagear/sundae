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
    C_CircleCollider,
    C_CircleColliderJSON,
} from './colliders/CircleCollider';
import {
    C_RectangleCollider,
    C_RectangleColliderJSON,
} from './colliders/RectangleCollider';
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
import { C_Rigidbody, C_RigidbodyJSON } from './rigidbody';
import { C_Transform, C_TransformJSON } from './transforms';

export { Component };
export type { ComponentOptions };

// Type for component constructors
export type ComponentConstructor<T extends Component = Component> = new (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any,
) => T;

type IfAny<T, TIfAny, TIfNotAny> = 0 extends 1 & T ? TIfAny : TIfNotAny;

// Extract constructor options from a component class
type ExtractComponentOptions<TCtor extends ComponentConstructor> =
    TCtor extends new (
        options: infer TOptions extends ComponentOptions,
    ) => Component
        ? IfAny<TOptions, ComponentOptions, TOptions>
        : never;

// Custom component JSON type for class constructors
export type CustomComponentJSON<TCtor extends ComponentConstructor> =
    ExtractComponentOptions<TCtor> & {
        type: TCtor;
    };

// String-based component types
export type StringComponentJSON =
    | C_TransformJSON
    | C_TextJSON
    | C_ShapeJSON
    | C_ImageJSON
    | C_PointerTargetJSON
    | C_LerpJSON
    | C_LerpPositionJSON
    | C_LerpOpacityJSON
    | C_LerpRotationJSON
    | C_CircleColliderJSON
    | C_RectangleColliderJSON
    | C_RigidbodyJSON;

// Combined component JSON type supporting both strings and class constructors
// Note: When using class constructors, use the function overloads directly
export type ComponentJSON = StringComponentJSON;

export function createComponentFromJSON<TEngine extends Engine = Engine>(
    json:
        | (ComponentJSON & InternalComponentOptions<TEngine>)
        | (CustomComponentJSON<ComponentConstructor> &
              InternalComponentOptions<TEngine>),
): Component<TEngine> {
    // Check if type is a constructor function
    if (typeof json.type === 'function') {
        const Constructor = json.type as ComponentConstructor<
            Component<TEngine>
        >;
        return new Constructor(json);
    }

    // Handle string-based types
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
        case 'circleCollider':
            return new C_CircleCollider<TEngine>(json);
        case 'rectangleCollider':
            return new C_RectangleCollider<TEngine>(json);
        case 'rigidbody':
            return new C_Rigidbody<TEngine>(json);
        case 'transform':
            return new C_Transform<TEngine>(json);
        default:
            throw new Error('Unknown component type');
    }
}
