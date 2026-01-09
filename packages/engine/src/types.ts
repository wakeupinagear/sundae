import type { IVector } from './math/vector';
import type { RenderCommandStream } from './systems/render/command';

export interface BoundingBox {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}

/**
 * Canvas context interface containing only the methods and properties that the engine uses.
 * This ensures compatibility between browser CanvasRenderingContext2D and skia-canvas.
 */
export interface ICanvasRenderingContext2D {
    // Transform methods
    setTransform(
        a: number,
        b: number,
        c: number,
        d: number,
        e: number,
        f: number,
    ): void;
    transform(
        a: number,
        b: number,
        c: number,
        d: number,
        e: number,
        f: number,
    ): void;
    translate(x: number, y: number): void;

    // Drawing methods
    fillRect(x: number, y: number, w: number, h: number): void;
    strokeRect(x: number, y: number, w: number, h: number): void;
    clearRect(x: number, y: number, w: number, h: number): void;

    // Path methods
    beginPath(): void;
    closePath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    ellipse(
        x: number,
        y: number,
        radiusX: number,
        radiusY: number,
        rotation: number,
        startAngle: number,
        endAngle: number,
    ): void;
    fill(): void;
    stroke(): void;

    // Image and text methods
    // Using a flexible type for image to support both browser (CanvasImageSource) and skia-canvas (CanvasDrawable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawImage(image: any, dx: number, dy: number, dw: number, dh: number): void;
    fillText(text: string, x: number, y: number): void;
    strokeText(text: string, x: number, y: number): void;

    // Style properties - using flexible types to support both browser and skia-canvas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fillStyle: string | any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strokeStyle: string | any;
    lineWidth: number;
    lineJoin: CanvasLineJoin;
    lineCap: CanvasLineCap;
    globalAlpha: number;

    // Text properties - using string for textAlign to support both browser and skia-canvas variants
    font: string;
    textAlign: string;
    textBaseline: string;

    // Image smoothing
    imageSmoothingEnabled: boolean;
}

/**
 * Generic canvas interface that both HTMLCanvasElement and other canvas implementations
 * (like skia-canvas) can conform to. This allows the engine to work with any canvas
 * implementation that provides these core methods and properties.
 */
export interface ICanvas {
    width: number;
    height: number;
    getContext(contextId: '2d'): ICanvasRenderingContext2D | null;
    // Optional style property for HTML canvas cursor support
    style?: {
        cursor?: string;
    };
}

export type RecursiveArray<T> = Array<RecursiveArray<T> | T>;

export interface CameraData {
    zoom: number;
    rotation: number;
    position: IVector<number>;
}
export interface CameraMetadata {
    size: IVector<number>;
    boundingBox: BoundingBox;
    cullBoundingBox: BoundingBox;
    dirty: boolean;
}

export interface Camera extends CameraData, CameraMetadata {}

export interface Renderable {
    queueRenderCommands(stream: RenderCommandStream, camera: Camera): void;
}

// prettier-ignore
export type WebKey =
    // Modifier keys
    "Alt" | "AltGraph" | "CapsLock" | "Control" | "Fn" | "FnLock" | "Meta" | "NumLock" | "ScrollLock" | "Shift" | "Symbol" | "SymbolLock"
    // Whitespace / navigation
    | "Enter" | "Tab" | " " | "Spacebar" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp" | "End" | "Home" | "PageDown" | "PageUp"
    // Editing keys
    | "Backspace" | "Clear" | "Copy" | "CrSel" | "Cut" | "Delete" | "EraseEof" | "ExSel" | "Insert" | "Paste" | "Redo" | "Undo"
    // UI
    | "Accept" | "Again" | "Attn" | "Cancel" | "ContextMenu" | "Escape" | "Execute" | "Find" | "Help" | "Pause" | "Play" | "Props" | "Select" | "ZoomIn" | "ZoomOut"
    // Function keys
    | "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9" | "F10" | "F11" | "F12" | "F13" | "F14" | "F15" | "F16" | "F17" | "F18" | "F19" | "F20" | "F21" | "F22" | "F23" | "F24"
    // Digits
    | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
    // Letters
    | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z"
    | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"
    // Numpad keys
    | "Decimal" | "Key11" | "Key12" | "Multiply" | "Add" | "Subtract" | "Divide" | "Separator" | "NumLock"
    | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
    // Symbols / punctuation
    | "`" | "-" | "=" | "[" | "]" | "\\" | ";" | "'" | "," | "." | "/" | "~" | "!" | "@" | "#" | "$" | "%" | "^" | "&" | "*" | "(" | ")" | "_" | "+" | "{" | "}" | "|" | ":" | "\"" | "<" | ">" | "?"
    // Composition / IME
    | "Dead" | "Compose" | "AllCandidates" | "Alphanumeric" | "CodeInput" | "FinalMode" | "GroupFirst" | "GroupLast" | "GroupNext" | "GroupPrevious" | "ModeChange" | "NextCandidate" | "NonConvert" | "PreviousCandidate" | "Process" | "SingleCandidate" | "Convert" | "Hiragana" | "Katakana" | "Kanji"
    // Multimedia
    | "MediaPlayPause" | "MediaStop" | "MediaTrackNext" | "MediaTrackPrevious" | "MediaSelect" | "LaunchMail" | "LaunchApp1" | "LaunchApp2"
    // Browser controls
    | "BrowserBack" | "BrowserFavorites" | "BrowserForward" | "BrowserHome" | "BrowserRefresh" | "BrowserSearch" | "BrowserStop"
    // Gamepad / misc
    | "Soft1" | "Soft2" | "Soft3" | "Soft4"

export interface CacheStats {
    total: number;
    cached: number;
}

export type OneAxisAlignment = 'start' | 'center' | 'end';

export type TwoAxisAlignment =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'left'
    | 'center'
    | 'right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
