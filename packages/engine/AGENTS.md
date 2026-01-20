# Engine Instructions

## Project Info

- This is the game engine package of Sundae.

## High-Level Architecture

### Core Game Engine

- The custom engine lives under `src/utils/engine` and follows an Entity-Component-System style: `Entity` objects (with a built-in transform) own components and child entities, `Component`s expose rendering/collision/interaction data, and `System`s such as `RenderSystem`, `CameraSystem`, `PointerSystem`, `KeyboardSystem`, and `ImageSystem` drive updates each frame.
- Scenes are created via `SceneSystem` and host collections of entities; they are instantiated directly from their class constructors and rendered through a single `Engine` loop that manages input, updates, and batching render commands on a shared canvas.
- Utility modules (`components`, `systems`, `types`, `utils`) handle low-level math, DOM matrices, pointer/keyboard bindings, and render command queues so higher layers can focus on gameplay/editor logic.

### JSON Syntax

- All entities and components are designed to be instantiated through typesafe JSON syntax, where the JSON contains a `type` field indicating which class to instantiate.
    - The `type` field can also be the class constructor of a custom class.
- When adding brand new entities/components, you'll need to do a few things to make it properly work with the JSON:
    - Export a custom interface for the options, even if no extra properties are added.
    - Export a JSON interface that extends the custom options interface and adds a type string.
    - Add the JSON interface to the corresponding factory file's type union.
    
## General Development Rules

- Do not use the browser's default globals (`console`, `navigator`, etc) as the engine should be able to run headless in Node-like environments.
- Prefer `engine.log` to `console.log`, where the engine is a reference to the `Engine` instance
- Prefer **small, focused changes** that respect the existing ECS and level-editor architecture instead of introducing new one-off patterns.
- All rotations are in degrees, not radians.