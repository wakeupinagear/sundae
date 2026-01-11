/** @type {import("eslint").Linter.Config} */
module.exports = {
    root: true,
    extends: ['@repo/eslint-config/index.js'],
    rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        "no-restricted-properties": [
            "warn",
            {
                object: "Math",
                property: "random",
                message: "Use engine.random() instead of Math.random() for deterministic random numbers.",
            },
        ]
    },
};
