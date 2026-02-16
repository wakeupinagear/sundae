import type { Engine } from '@repo/engine';
import type { E_Text } from '@repo/engine/entities';
import { Scene } from '@repo/engine/scene';

import type { EngineScenario } from '../types';

const WORDS = [
    'alpha',
    'beta',
    'gamma',
    'delta',
    'epsilon',
    'zeta',
    'eta',
    'theta',
    'iota',
    'kappa',
    'lambda',
    'mu',
    'nu',
    'xi',
    'omicron',
    'pi',
    'rho',
    'sigma',
    'tau',
    'upsilon',
    'phi',
    'chi',
    'psi',
    'omega',
    'lorem',
    'ipsum',
    'dolor',
    'sit',
    'amet',
    'consectetur',
    'adipiscing',
    'elit',
    'sed',
    'do',
    'eiusmod',
    'tempor',
    'incididunt',
    'ut',
    'labore',
    'et',
    'dolore',
    'magna',
    'aliqua',
    'the',
    'quick',
    'brown',
    'fox',
    'jumps',
];

const COLORS = [
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#00ffff',
    '#ff8800',
    '#88ff00',
    '#0088ff',
    '#8800ff',
    '#ff0088',
    '#888888',
    '#444444',
    '#aa3333',
    '#33aa33',
    '#3333aa',
];

const SIZES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const BROWSER_WORD_COUNT = 12000;
const HEADLESS_WORD_COUNT = 3000;

function generateStressText(engine: Engine, wordCount: number): string {
    const parts: string[] = [];
    const openTags: string[] = [];

    const styleEntries: Array<{ open: () => string; close: string[] }> = [
        { open: () => `<|bold|>`, close: ['bold'] },
        { open: () => `<|italic|>`, close: ['italic'] },
        { open: () => `<|bold italic|>`, close: ['bold', 'italic'] },
        {
            open: () =>
                `<|color=${COLORS[Math.floor(engine.random() * COLORS.length)]}|>`,
            close: ['color'],
        },
        {
            open: () =>
                `<|size=${SIZES[Math.floor(engine.random() * SIZES.length)]}|>`,
            close: ['size'],
        },
    ];

    for (let i = 0; i < wordCount; i++) {
        if (engine.random() * COLORS.length < 0.15 && openTags.length > 0) {
            const idx = Math.floor(engine.random() * openTags.length);
            parts.push(`<|/${openTags.splice(idx, 1)[0]}|>`);
        }
        if (engine.random() < 0.25) {
            const entry =
                styleEntries[Math.floor(engine.random() * styleEntries.length)];
            parts.push(entry.open());
            openTags.push(...entry.close);
        }
        parts.push(WORDS[Math.floor(engine.random() * WORDS.length)]);
        if (engine.random() < 0.01) parts.push('\n');
        else if (engine.random() < 0.3) parts.push(', ');
        else parts.push(' ');
    }
    while (openTags.length > 0) {
        parts.push(`<|/${openTags.pop()}|>`);
    }
    return parts.join('').trim();
}

class TextStressScene extends Scene {
    #textEntity!: E_Text;
    #stressText!: string;
    #wordCount = BROWSER_WORD_COUNT;

    override create() {
        this.#stressText = generateStressText(this._engine, this.#wordCount);
        this.#textEntity = this.createEntity({
            name: 'stress-text',
            type: 'text',
            text: this.#stressText,
            positionRelativeToCamera: 'start',
            textAlign: 'bottom-right',
            scaleRelativeToCamera: true,
            padding: { x1: 8, y1: 8, x2: 8, y2: 8 },
            background: true,
        }) as E_Text;
    }

    override update(): boolean | void {
        const cameraWidth = this._engine.getCamera()?.size?.x;
        const canvasWidth = this._engine.getCanvasSize()?.x;
        const maxWidth = cameraWidth ?? canvasWidth;
        if (maxWidth && maxWidth > 0) {
            this.#textEntity.textComponent.maxWidth = maxWidth;
        }

        this.#textEntity.text =
            this.#stressText +
            this._engine.random().toString(36).substring(2, 15);
    }
}

export const textStressTest: EngineScenario = (harness) => {
    harness.engine.options = {
        cameraOptions: {
            canDrag: false,
            scrollMode: 'none',
        },
    };
    harness.engine.openScene(TextStressScene);
};
