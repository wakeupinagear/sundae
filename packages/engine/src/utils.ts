export const lerp = (from: number, to: number, t: number): number => {
    return from + (to - from) * t;
};
export const zoomToScale = (zoom: number): number => {
    return Math.pow(2, zoom);
};

export const scaleToZoom = (scale: number): number => {
    return Math.log2(scale);
};

export const OPACITY_THRESHOLD = 0.001;
