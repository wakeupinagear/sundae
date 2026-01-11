import { Entity, EntityOptions } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import { EngineScenario } from '..';

// Custom entity classes for testing
interface E_CustomOptions extends EntityOptions {
    customProp: string;
    optionalProp?: number;
}

class E_Custom extends Entity {
    constructor(options: E_CustomOptions) {
        super(options);
    }
}

interface E_AnotherCustomOptions extends EntityOptions {
    anotherProp: boolean;
}

class E_AnotherCustom extends Entity {
    constructor(options: E_AnotherCustomOptions) {
        super(options);
    }
}

class TypeErrorsScene extends Scene {
    override create() {
        this.createEntity({
            name: 'good',
        });

        // @ts-expect-error - `text` requires `type: 'text'`
        this.createEntity({
            name: 'bad',
            text: 'nope',
        });

        // Test with custom class as type - GOOD
        this.createEntity({
            type: E_Custom,
            customProp: 'valid',
            name: 'custom entity',
        });

        // Test with custom class and optional prop - GOOD
        this.createEntity({
            type: E_Custom,
            customProp: 'valid',
            optionalProp: 42,
        });

        // @ts-expect-error - missing required `customProp`
        this.createEntity({
            type: E_Custom,
            name: 'missing required prop',
        });

        // @ts-expect-error - wrong type for `customProp`
        this.createEntity({
            type: E_Custom,
            customProp: 123,
        });

        // @ts-expect-error - extra property not in E_CustomOptions
        this.createEntity({
            type: E_Custom,
            customProp: 'valid',
            invalidProp: 'should error',
        });
    }
}

export const typeErrors: EngineScenario = async (harness) => {
    harness.engine.openScene(TypeErrorsScene);

    harness.engine.createEntities(
        {
            name: 'good',
        },
        {
            name: 'also good',
        },
    );

    // @ts-expect-error - missing `type: 'text'`
    harness.engine.createEntities({
        text: 'bad',
    });
    harness.engine.createEntities({
        type: 'text',
        text: 'good',
    });
    // @ts-expect-error - missing `type: 'text'`
    harness.engine.createEntities(
        {
            text: 'bad',
        },
        {
            text: 'bad',
        },
    );
    harness.engine.createEntities(
        {
            type: 'text',
            text: 'good',
        },
        {
            type: 'text',
            text: 'good',
        },
    );

    // Test custom classes with Engine.createEntities
    harness.engine.createEntities({
        type: E_Custom,
        customProp: 'valid from engine',
    });

    // @ts-expect-error - missing required customProp
    harness.engine.createEntities({
        type: E_Custom,
        name: 'missing prop',
    });

    // Test multiple custom entities of the same type
    harness.engine.createEntities(
        {
            type: E_Custom,
            customProp: 'first',
        },
        {
            type: E_Custom,
            customProp: 'second',
        },
    );

    // Test different custom entity types (must be separate calls)
    harness.engine.createEntities({
        type: E_AnotherCustom,
        anotherProp: true,
    });

    // @ts-expect-error - wrong props for E_Custom
    harness.engine.createEntities({
        type: E_Custom,
        anotherProp: true,
    });

    // Test mixing string types and class types (must be separate calls due to generic constraints)
    harness.engine.createEntities({
        type: 'text',
        text: 'string type',
    });
    harness.engine.createEntities({
        type: E_Custom,
        customProp: 'class type',
    });
};
