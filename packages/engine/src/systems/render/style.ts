export const TRANSPARENT_STYLE_COLOR = 'rgba(0, 0, 0, 0)';

export interface RenderStyle {
    color?: string | CanvasGradient | CanvasPattern;
    lineColor?: string | CanvasGradient | CanvasPattern;
    lineWidth?: number;
    lineJoin?: CanvasLineJoin;
    lineCap?: CanvasLineCap;
    imageSmoothingEnabled?: boolean;
    font?: string;
    textBaseline?: CanvasTextBaseline;
}

export const DEFAULT_RENDER_STYLE: Required<RenderStyle> = {
    color: TRANSPARENT_STYLE_COLOR,
    lineColor: TRANSPARENT_STYLE_COLOR,
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
