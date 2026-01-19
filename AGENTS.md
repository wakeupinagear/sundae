# Root Instructions

## Project Info

- This is a Turborepo monorepo for Sundae, a TypeScript game engine.
- Here are the important subprojects:
    - `packages/engine` - the engine source code
    - `packages/engine-scenarios` - a library of example apps built with the engine
    - `packages/engine-tester` - a headless testing library that runs the scenarios and save snapshots of the tests
    - `apps/web` - Vite web app that hosts the scenarios via a React harness

## Tooling & Commands (for agents)

- Use **pnpm** for all commands in this repo:
    - `pnpm dev` to run the web server and watch project changes.
    - `pnpm build` to build the app.
    - `pnpm lint` to run ESLint.
- Never modify the available scripts or pre-commit hook unless explicitly asked.
- Do not attempt to test your changes in the browser - that's the user's job.
- Don't document your changes in a separate file unless explicitly asked to.