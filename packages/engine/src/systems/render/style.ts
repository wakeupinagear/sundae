export const TRANSPARENT_STYLE_COLOR = 'rgba(0, 0, 0, 0)';

export interface RenderStyle {
    color?: string | CanvasGradient | CanvasPattern;
    colorIsCSS?: boolean;
    lineColor?: string | CanvasGradient | CanvasPattern;
    lineColorIsCSS?: boolean;
    lineWidth?: number;
    lineJoin?: CanvasLineJoin;
    lineCap?: CanvasLineCap;
    imageSmoothingEnabled?: boolean;
    font?: string;
    textBaseline?: CanvasTextBaseline;
}

export const DEFAULT_RENDER_STYLE: Required<RenderStyle> = {
    color: TRANSPARENT_STYLE_COLOR,
    colorIsCSS: false,
    lineColor: TRANSPARENT_STYLE_COLOR,
    lineColorIsCSS: false,
    lineWidth: 0,
    lineJoin: 'miter',
    lineCap: 'butt',
    imageSmoothingEnabled: true,
    font: '10px sans-serif',
    textBaseline: 'top',
};

export const RENDER_STYLE_KEYS = Object.keys(
    DEFAULT_RENDER_STYLE,
) as (keyof RenderStyle)[];

export const isCSSColor = (color: string): boolean => {
    return color.startsWith('var(') && color.endsWith(')');
};

// Assumes the color is a CSS variable
export const getCSSColor = (color: string): string => {
    return color.slice(4, -1);
};
