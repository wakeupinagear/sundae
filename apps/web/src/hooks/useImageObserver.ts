import { useEffect, useMemo } from 'react';

const IMAGE_INTERSECTION_OPTIONS: IntersectionObserverInit = {
    threshold: 0.01,
};

export function useImageObserver() {
    const observer = useMemo(() => {
        return new IntersectionObserver((entries, obs) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const img = entry.target as HTMLImageElement;
                const src = img.dataset.src;
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                    obs.unobserve(img);
                }
            }
        }, IMAGE_INTERSECTION_OPTIONS);
    }, []);

    useEffect(() => () => observer.disconnect(), [observer]);

    return observer;
}
