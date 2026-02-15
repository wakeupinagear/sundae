import { C_Drawable, type C_DrawableOptions } from '../components/drawable';
import type { Engine } from '../engine';
import { BoundingBox, type BoundingBoxConstructor } from '../math/boundingBox';
import { Vector, type VectorConstructor } from '../math/vector';
import type { CameraSystem } from '../systems/camera';
import type { RenderCommandStream } from '../systems/render/command';
import type { TwoAxisAlignment } from '../types';

const MONOSPACE_WIDTH_RATIO = 0.6;
const MONOSPACE_HEIGHT_RATIO = 0.8;

const TagKeys = {
    COLOR: 'color',
    SIZE: 'size',
    FAMILY: 'family',
    OPACITY: 'opacity',
    BOLD: 'bold',
    BOLD_SHORT: 'b',
    ITALIC: 'italic',
    ITALIC_SHORT: 'i',
} as const;
type TagKeys = (typeof TagKeys)[keyof typeof TagKeys];

type FontFamily = 'sans-serif' | 'serif' | 'monospace';

type Trim = 'none' | 'all' | 'ends';

type TextDrawAction =
    | {
          type: 'setStyle';
          fontSize: number;
          fontFamily: FontFamily;
          color: string;
          bold: boolean;
          italic: boolean;
      }
    | {
          type: 'setOpacity';
          opacity: number;
      }
    | {
          type: 'drawText';
          text: string;
          x: number;
          y: number;
      };

interface TextStyle {
    fontSize?: number;
    fontFamily?: FontFamily;
    color?: string;
    opacity?: number;
    bold?: boolean;
    italic?: boolean;
}

type TextNode =
    | {
          type: 'text';
          text: string;
      }
    | {
          type: 'style';
          style: Required<TextStyle>;
      }
    | {
          type: 'newline';
      };

type Padding = BoundingBoxConstructor | VectorConstructor | number;

export interface C_TextOptions extends C_DrawableOptions {
    text?: string;
    fontSize?: number;
    fontFamily?: FontFamily;
    lineGap?: number;
    textAlign?: TwoAxisAlignment;
    trim?: Trim;
    italic?: boolean;
    bold?: boolean;
    opacity?: number;
    startTagDelim?: string;
    endTagDelim?: string;
    padding?: Padding;
    maxWidth?: number;
}

export interface C_TextJSON extends C_TextOptions {
    type: 'text';
}

export class C_Text<
    TEngine extends Engine = Engine,
> extends C_Drawable<TEngine> {
    public static typeString: string = 'C_Text';

    #text: string;
    #fontSize: number;
    #fontFamily: FontFamily;
    #lineGap: number;
    #textAlign: TwoAxisAlignment;
    #trim: Trim;
    #startTagDelim: string;
    #endTagDelim: string;
    #italic: boolean;
    #bold: boolean;
    #maxWidth?: number;

    #padding: BoundingBox = new BoundingBox(0);

    #textDirty: boolean = true;
    #drawActions: TextDrawAction[] = [];
    #textPosition: Vector = new Vector(0);
    #textSize: Vector = new Vector(0);

    constructor(options: C_TextOptions) {
        super({
            color: 'white',
            ...options,
        });

        this.#text = options.text ?? '';
        this.#fontSize = options.fontSize ?? 12;
        this.#fontFamily = options.fontFamily ?? 'monospace';
        this.#lineGap = options.lineGap ?? this.#fontSize * 0.5;
        this.#textAlign = options.textAlign ?? 'top-left';
        this.#trim = options.trim ?? 'all';
        this.#startTagDelim = options.startTagDelim ?? '<|';
        this.#endTagDelim = options.endTagDelim ?? '|>';
        this.#italic = options.italic ?? false;
        this.#bold = options.bold ?? false;
        this.#maxWidth = options.maxWidth;

        this.#padding.set(options.padding ?? 0);
    }

    override get typeString(): string {
        return C_Text.typeString;
    }

    get text(): string {
        return this.#text;
    }

    set text(text: string) {
        if (text != this.#text) {
            this.#text = text;
            this.#markTextDirty();
        }
    }

    get fontSize(): number {
        return this.#fontSize;
    }

    set fontSize(fontSize: number) {
        if (fontSize != this.#fontSize) {
            this.#fontSize = fontSize;
            this.#markTextDirty();
        }
    }

    get fontFamily(): FontFamily {
        return this.#fontFamily;
    }

    set fontFamily(fontFamily: FontFamily) {
        if (fontFamily != this.#fontFamily) {
            this.#fontFamily = fontFamily;
            this.#markTextDirty();
        }
    }

    get lineGap(): number {
        return this.#lineGap;
    }

    set lineGap(lineGap: number) {
        if (lineGap != this.#lineGap) {
            this.#lineGap = lineGap;
            this.#markTextDirty();
        }
    }

    get textAlign(): TwoAxisAlignment {
        return this.#textAlign;
    }

    set textAlign(textAlign: TwoAxisAlignment) {
        if (textAlign != this.#textAlign) {
            this.#textAlign = textAlign;
            this.#markTextDirty();
        }
    }

    get trim(): Trim {
        return this.#trim;
    }

    set trim(trim: Trim) {
        if (trim != this.#trim) {
            this.#trim = trim;
            this.#markTextDirty();
        }
    }

    get italic(): boolean {
        return this.#italic;
    }

    set italic(italic: boolean) {
        if (italic != this.#italic) {
            this.#italic = italic;
            this.#markTextDirty();
        }
    }

    get bold(): boolean {
        return this.#bold;
    }

    set bold(bold: boolean) {
        if (bold != this.#bold) {
            this.#bold = bold;
            this.#markTextDirty();
        }
    }

    get startTagDelim(): string {
        return this.#startTagDelim;
    }

    set startTagDelim(startTagDelim: string) {
        if (startTagDelim != this.#startTagDelim) {
            this.#startTagDelim = startTagDelim;
            this.#markTextDirty();
        }
    }

    get endTagDelim(): string {
        return this.#endTagDelim;
    }

    set endTagDelim(endTagDelim: string) {
        if (endTagDelim != this.#endTagDelim) {
            this.#endTagDelim = endTagDelim;
            this.#markTextDirty();
        }
    }

    get padding(): BoundingBox {
        return this.#padding;
    }

    set padding(padding: Padding) {
        if (this.#padding.set(padding)) {
            this._markBoundsDirty();
        }
    }

    get maxWidth(): number | undefined {
        return this.#maxWidth;
    }

    set maxWidth(maxWidth: number | undefined) {
        if (maxWidth != this.#maxWidth) {
            this.#maxWidth = maxWidth;
            this.#markTextDirty();
        }
    }

    override queueRenderCommands(
        stream: RenderCommandStream,
        camera: CameraSystem,
    ): boolean {
        if (!this.#text || !super.queueRenderCommands(stream, camera)) {
            return false;
        }

        if (this.#textDirty) {
            this.#computeTextLines();
            this.#textDirty = false;
        }

        const opacity = stream.currentOpacity * this.opacity;
        for (const action of this.#drawActions) {
            if (action.type === 'setStyle') {
                const fontStyle = action.italic ? 'italic ' : '';
                const fontWeight = action.bold ? 'bold ' : '';
                stream.setStyle({
                    color: action.color,
                    font: `${fontStyle}${fontWeight}${action.fontSize}px ${action.fontFamily}`,
                });
            } else if (action.type === 'setOpacity') {
                stream.setOpacity(action.opacity * opacity);
            } else {
                stream.drawText(action.text, action.x, action.y);
            }
        }

        this._onFinishQueueRenderCommands(stream);

        return true;
    }

    override _computeBoundingBox(): void {
        if (this.#textDirty) {
            this.#computeTextLines();
            this.#textDirty = false;
        }

        const totalWidth =
            this.#textSize.x + this.#padding.x1 + this.#padding.x2;
        const totalHeight =
            this.#textSize.y + this.#padding.y1 + this.#padding.y2;
        this._setBoundingBox({
            x1: -this._origin.x * totalWidth,
            y1: -this._origin.y * totalHeight,
            x2: (1 - this._origin.x) * totalWidth,
            y2: (1 - this._origin.y) * totalHeight,
        });
    }

    #computeTextLines() {
        this.#drawActions = [];
        this.#textSize.set(0);
        this.#textPosition.set(0);

        const nodes = this.#parseTextLines(this.#text);

        // First pass: organize nodes into lines and calculate dimensions
        interface Line {
            nodes: TextNode[];
            width: number;
            height: number;
            maxFontSize: number;
        }

        const lines: Line[] = [];
        let currentLine: TextNode[] = [];
        let currentLineWidth = 0;
        let maxFontSizeInLine = this.#fontSize;
        let currentStyle: Required<TextStyle> = {
            fontSize: this.#fontSize,
            fontFamily: this.#fontFamily,
            color:
                typeof this.computedStyle.color === 'string'
                    ? this.computedStyle.color
                    : 'white',
            opacity: 1,
            bold: this.#bold,
            italic: this.#italic,
        };
        this.#drawActions.push({ type: 'setStyle', ...currentStyle });
        const maxWidth = this.#maxWidth;

        const pushTextNode = (text: string) => {
            if (!text) return;
            const prevNode = currentLine[currentLine.length - 1];
            if (prevNode?.type === 'text') {
                prevNode.text += text;
            } else {
                currentLine.push({ type: 'text', text });
            }
            currentLineWidth +=
                currentStyle.fontSize * MONOSPACE_WIDTH_RATIO * text.length;
            maxFontSizeInLine = Math.max(
                maxFontSizeInLine,
                currentStyle.fontSize,
            );
        };

        const pushLine = () => {
            const height = maxFontSizeInLine * MONOSPACE_HEIGHT_RATIO;
            lines.push({
                nodes: currentLine,
                width: currentLineWidth,
                height,
                maxFontSize: maxFontSizeInLine,
            });
            currentLine = [];
            currentLineWidth = 0;
            maxFontSizeInLine = currentStyle.fontSize;
        };

        const wrapTextOnMaxWidth = (text: string) => {
            if (maxWidth == null || maxWidth <= 0) {
                pushTextNode(text);
                return;
            }

            const charWidth = currentStyle.fontSize * MONOSPACE_WIDTH_RATIO;
            const tokens = text.match(/ +|[^ ]+/g) ?? [];

            for (const token of tokens) {
                const isSpaceToken = token.trim().length === 0;
                const tokenWidth = charWidth * token.length;
                if (currentLineWidth + tokenWidth <= maxWidth) {
                    pushTextNode(token);
                    continue;
                }

                if (isSpaceToken) {
                    if (currentLineWidth > 0) {
                        pushLine();
                    }
                    continue;
                }

                if (currentLineWidth > 0) {
                    pushLine();
                }

                if (tokenWidth <= maxWidth) {
                    pushTextNode(token);
                    continue;
                }

                // Token is longer than maxWidth, so split by characters.
                let chunk = '';
                for (const char of token) {
                    const chunkWidth = charWidth * chunk.length;
                    if (chunk && chunkWidth + charWidth > maxWidth) {
                        pushTextNode(chunk);
                        pushLine();
                        chunk = char;
                    } else {
                        chunk += char;
                    }
                }
                if (chunk) {
                    pushTextNode(chunk);
                }
            }
        };

        for (const node of nodes) {
            if (node.type === 'style') {
                currentStyle = node.style;
                maxFontSizeInLine = Math.max(
                    maxFontSizeInLine,
                    currentStyle.fontSize,
                );
                currentLine.push(node);
            } else if (node.type === 'newline') {
                pushLine();
            } else if (node.type === 'text') {
                wrapTextOnMaxWidth(node.text);
            }
        }

        // Add the last line if it has content
        if (currentLine.length > 0) {
            const height = maxFontSizeInLine * MONOSPACE_HEIGHT_RATIO;
            lines.push({
                nodes: currentLine,
                width: currentLineWidth,
                height,
                maxFontSize: maxFontSizeInLine,
            });
        }

        // Apply trimming
        const trimmedLines: Line[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const shouldTrim =
                this.#trim === 'all' ||
                (this.#trim === 'ends' && (i === 0 || i === lines.length - 1));

            if (shouldTrim) {
                // Trim whitespace from text nodes
                const trimmedNodes: TextNode[] = [];
                let hasContent = false;

                for (const node of line.nodes) {
                    if (node.type === 'text') {
                        const trimmed =
                            i === 0 && i === lines.length - 1
                                ? node.text.trim()
                                : i === 0
                                  ? node.text.trimStart()
                                  : i === lines.length - 1
                                    ? node.text.trimEnd()
                                    : node.text;
                        if (trimmed) {
                            trimmedNodes.push({ type: 'text', text: trimmed });
                            hasContent = true;
                        }
                    } else {
                        trimmedNodes.push(node);
                    }
                }

                if (
                    hasContent ||
                    trimmedNodes.some((n) => n.type === 'style')
                ) {
                    // Recalculate width
                    let width = 0;
                    let currentFontSize = this.#fontSize;
                    for (const node of trimmedNodes) {
                        if (node.type === 'style') {
                            currentFontSize = node.style.fontSize;
                        } else if (node.type === 'text') {
                            width +=
                                currentFontSize *
                                MONOSPACE_WIDTH_RATIO *
                                node.text.length;
                        }
                    }
                    trimmedLines.push({
                        nodes: trimmedNodes,
                        width,
                        height: line.height,
                        maxFontSize: line.maxFontSize,
                    });
                }
            } else {
                trimmedLines.push(line);
            }
        }

        // Calculate overall dimensions
        const overallWidth = Math.max(...trimmedLines.map((l) => l.width), 0);
        let overallHeight = 0;
        for (let i = 0; i < trimmedLines.length; i++) {
            overallHeight += trimmedLines[i].height;
            if (i < trimmedLines.length - 1) {
                overallHeight += this.#lineGap;
            }
        }

        // Calculate alignment offsets
        // Text position is top-left of content area inside the component's box.
        const totalWidth = overallWidth + this.#padding.x1 + this.#padding.x2;
        const totalHeight = overallHeight + this.#padding.y1 + this.#padding.y2;
        const boxX1 = -this._origin.x * totalWidth;
        const boxY1 = -this._origin.y * totalHeight;
        const boxX2 = boxX1 + totalWidth;
        const boxY2 = boxY1 + totalHeight;

        // Horizontal alignment
        switch (this.#textAlign) {
            case 'top-left':
            case 'left':
            case 'bottom-left':
                this.#textPosition.x = boxX1 + this.#padding.x1;
                break;
            case 'top-center':
            case 'center':
            case 'bottom-center':
                this.#textPosition.x = boxX1 + (totalWidth - overallWidth) / 2;
                break;
            case 'top-right':
            case 'right':
            case 'bottom-right':
                this.#textPosition.x = boxX2 - this.#padding.x2 - overallWidth;
                break;
        }

        // Vertical alignment
        switch (this.#textAlign) {
            case 'top-left':
            case 'top-center':
            case 'top-right':
                this.#textPosition.y = boxY1 + this.#padding.y1;
                break;
            case 'left':
            case 'center':
            case 'right':
                this.#textPosition.y =
                    boxY1 + (totalHeight - overallHeight) / 2;
                break;
            case 'bottom-left':
            case 'bottom-center':
            case 'bottom-right':
                this.#textPosition.y = boxY2 - this.#padding.y2 - overallHeight;
                break;
        }

        // Second pass: generate draw actions with proper positioning
        let currentY = this.#textPosition.y;

        // Track previous style to avoid redundant actions
        let lastFontSize = this.#fontSize;
        let lastFontFamily = this.#fontFamily;
        let lastColor =
            typeof this.style.color === 'string' ? this.style.color : 'white';
        let lastOpacity = 1;
        let lastBold = false;
        let lastItalic = false;

        for (const line of trimmedLines) {
            let currentX = this.#textPosition.x;

            // Apply per-line horizontal alignment
            switch (this.#textAlign) {
                case 'top-left':
                case 'left':
                case 'bottom-left':
                    currentX = this.#textPosition.x;
                    break;
                case 'top-center':
                case 'center':
                case 'bottom-center':
                    currentX =
                        this.#textPosition.x + (overallWidth - line.width) / 2;
                    break;
                case 'top-right':
                case 'right':
                case 'bottom-right':
                    currentX =
                        this.#textPosition.x + (overallWidth - line.width);
                    break;
            }

            let currentFontSize = lastFontSize;

            for (const node of line.nodes) {
                if (node.type === 'style') {
                    currentFontSize = node.style.fontSize;

                    // Only emit setStyle if font/color changed
                    if (
                        node.style.fontSize !== lastFontSize ||
                        node.style.fontFamily !== lastFontFamily ||
                        node.style.color !== lastColor ||
                        node.style.bold !== lastBold ||
                        node.style.italic !== lastItalic
                    ) {
                        this.#drawActions.push({
                            type: 'setStyle',
                            fontSize: node.style.fontSize,
                            fontFamily: node.style.fontFamily,
                            color: node.style.color,
                            bold: node.style.bold,
                            italic: node.style.italic,
                        });
                        lastFontSize = node.style.fontSize;
                        lastFontFamily = node.style.fontFamily;
                        lastColor = node.style.color;
                        lastBold = node.style.bold;
                        lastItalic = node.style.italic;
                    }

                    // Only emit setOpacity if opacity changed
                    if (node.style.opacity !== lastOpacity) {
                        this.#drawActions.push({
                            type: 'setOpacity',
                            opacity: node.style.opacity,
                        });
                        lastOpacity = node.style.opacity;
                    }
                } else if (node.type === 'text') {
                    const currentHeight =
                        currentFontSize * MONOSPACE_HEIGHT_RATIO;
                    const verticalOffset = (line.height - currentHeight) / 2;

                    this.#drawActions.push({
                        type: 'drawText',
                        text: node.text,
                        x: currentX,
                        y: currentY + verticalOffset,
                    });
                    currentX +=
                        currentFontSize *
                        MONOSPACE_WIDTH_RATIO *
                        node.text.length;
                }
            }

            currentY += line.height + this.#lineGap;
        }

        while (
            this.#drawActions.length > 0 &&
            this.#drawActions[this.#drawActions.length - 1].type !== 'drawText'
        ) {
            this.#drawActions.pop();
        }

        this.#textSize.set({
            x: overallWidth,
            y: overallHeight,
        });
        this._markBoundsDirty();
    }

    #parseTextLines(text: string): TextNode[] {
        // Initialize default style
        const defaultStyle: Required<TextStyle> = {
            fontSize: this.#fontSize,
            fontFamily: this.#fontFamily,
            color:
                typeof this.computedStyle.color === 'string'
                    ? this.computedStyle.color
                    : 'white',
            opacity: 1,
            bold: false,
            italic: false,
        };

        const currentStyle: Required<TextStyle> = { ...defaultStyle };

        const nodes: TextNode[] = [
            { type: 'style', style: { ...currentStyle } },
        ];

        const len = text.length;
        let i = 0;
        let textStart = 0;
        let prevNode: TextNode | null = null;

        const startDelimLen = this.#startTagDelim.length;
        const endDelimLen = this.#endTagDelim.length;

        while (i < len) {
            const char = text[i];

            // Check for newline
            if (char === '\n') {
                if (i > textStart) {
                    prevNode = { type: 'text', text: text.slice(textStart, i) };
                    nodes.push(prevNode);
                }

                prevNode = { type: 'newline' };
                nodes.push(prevNode);

                i++;
                textStart = i;

                continue;
            }

            // Check for tag start
            if (text.slice(i, i + startDelimLen) === this.#startTagDelim) {
                if (i > textStart) {
                    prevNode = { type: 'text', text: text.slice(textStart, i) };
                    nodes.push(prevNode);
                }

                let tagEnd = i + startDelimLen;
                while (
                    tagEnd < len &&
                    text.slice(tagEnd, tagEnd + endDelimLen) !==
                        this.#endTagDelim
                ) {
                    tagEnd++;
                }

                if (tagEnd < len) {
                    const tagContent = text
                        .slice(i + startDelimLen, tagEnd)
                        .trim();

                    const attributes = tagContent.split(/\s+/);
                    let styleChanged = false;

                    for (const attr of attributes) {
                        const raw = attr.trim();
                        if (!raw) continue;

                        const isReset = raw.startsWith('/');
                        const key = (isReset ? raw.slice(1) : raw).trim();
                        if (!key) continue;

                        if (isReset) {
                            switch (key) {
                                case TagKeys.COLOR:
                                    if (
                                        currentStyle.color !==
                                        defaultStyle.color
                                    ) {
                                        currentStyle.color = defaultStyle.color;
                                        styleChanged = true;
                                    }
                                    break;
                                case TagKeys.SIZE:
                                    if (
                                        currentStyle.fontSize !==
                                        defaultStyle.fontSize
                                    ) {
                                        currentStyle.fontSize =
                                            defaultStyle.fontSize;
                                        styleChanged = true;
                                    }
                                    break;
                                case TagKeys.FAMILY:
                                    if (
                                        currentStyle.fontFamily !==
                                        defaultStyle.fontFamily
                                    ) {
                                        currentStyle.fontFamily =
                                            defaultStyle.fontFamily;
                                        styleChanged = true;
                                    }
                                    break;
                                case TagKeys.OPACITY:
                                    if (
                                        currentStyle.opacity !==
                                        defaultStyle.opacity
                                    ) {
                                        currentStyle.opacity =
                                            defaultStyle.opacity;
                                        styleChanged = true;
                                    }
                                    break;
                                case TagKeys.BOLD:
                                case TagKeys.BOLD_SHORT:
                                    if (
                                        currentStyle.bold !== defaultStyle.bold
                                    ) {
                                        currentStyle.bold = defaultStyle.bold;
                                        styleChanged = true;
                                    }
                                    break;
                                case TagKeys.ITALIC:
                                case TagKeys.ITALIC_SHORT:
                                    if (
                                        currentStyle.italic !==
                                        defaultStyle.italic
                                    ) {
                                        currentStyle.italic =
                                            defaultStyle.italic;
                                        styleChanged = true;
                                    }
                                    break;
                            }
                            continue;
                        }

                        const equalPos = attr.indexOf('=');
                        if (equalPos !== -1) {
                            const setKey = attr.slice(0, equalPos).trim();
                            const value = attr.slice(equalPos + 1).trim();
                            if (!setKey || !value) continue;
                            switch (setKey) {
                                case TagKeys.COLOR:
                                    if (currentStyle.color !== value) {
                                        currentStyle.color = value;
                                        styleChanged = true;
                                    }
                                    break;
                                case TagKeys.SIZE: {
                                    const newSize =
                                        Number(value) || this.#fontSize;
                                    if (currentStyle.fontSize !== newSize) {
                                        currentStyle.fontSize = newSize;
                                        styleChanged = true;
                                    }
                                    break;
                                }
                                case TagKeys.FAMILY:
                                    if (
                                        currentStyle.fontFamily !== value &&
                                        (value === 'sans-serif' ||
                                            value === 'serif' ||
                                            value === 'monospace')
                                    ) {
                                        currentStyle.fontFamily = value;
                                        styleChanged = true;
                                    }
                                    break;
                                case TagKeys.OPACITY: {
                                    const newOpacity = Number(value) || 1;
                                    if (currentStyle.opacity !== newOpacity) {
                                        currentStyle.opacity = newOpacity;
                                        styleChanged = true;
                                    }
                                    break;
                                }
                                case TagKeys.BOLD:
                                case TagKeys.BOLD_SHORT: {
                                    const newBold =
                                        value === 'true' || value === '1';
                                    if (currentStyle.bold !== newBold) {
                                        currentStyle.bold = newBold;
                                        styleChanged = true;
                                    }
                                    break;
                                }
                                case TagKeys.ITALIC:
                                case TagKeys.ITALIC_SHORT: {
                                    const newItalic =
                                        value === 'true' || value === '1';
                                    if (currentStyle.italic !== newItalic) {
                                        currentStyle.italic = newItalic;
                                        styleChanged = true;
                                    }
                                    break;
                                }
                            }
                        } else {
                            switch (key) {
                                case TagKeys.BOLD:
                                case TagKeys.BOLD_SHORT:
                                    currentStyle.bold = true;
                                    styleChanged = true;
                                    break;
                                case TagKeys.ITALIC:
                                case TagKeys.ITALIC_SHORT:
                                    currentStyle.italic = true;
                                    styleChanged = true;
                                    break;
                            }
                        }
                    }

                    if (styleChanged) {
                        this.#changeStyleNode(currentStyle, prevNode, nodes);
                    }

                    i = tagEnd + endDelimLen;
                    textStart = i;
                } else {
                    // Malformed tag
                    this._engine.warn(
                        `Text '${this.name} has malformed tag at index ${i}`,
                    );
                    i++;
                }
                continue;
            }

            i++;
        }

        if (i > textStart) {
            prevNode = { type: 'text', text: text.slice(textStart, i) };
            nodes.push(prevNode);
        }

        return nodes;
    }

    #changeStyleNode(
        currentStyle: Required<TextStyle>,
        prevNode: TextNode | null,
        nodes: TextNode[],
    ) {
        if (prevNode?.type === 'style') {
            prevNode.style = { ...currentStyle };
        } else {
            prevNode = { type: 'style', style: { ...currentStyle } };
            nodes.push(prevNode);
        }
    }

    #markTextDirty() {
        this.#textDirty = true;
        this._markBoundsDirty();
    }
}
