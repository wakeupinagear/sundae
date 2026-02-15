import { useEffect, useRef } from 'react';

interface LazyImgProps
    extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src: string;
    observer: IntersectionObserver;
}

export function LazyImg({ src, observer, ...props }: LazyImgProps) {
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const img = imgRef.current;
        if (!img) return;
        img.dataset.src = src;
        observer.observe(img);
        return () => observer.unobserve(img);
    }, [observer, src]);

    return <img ref={imgRef} {...props} />;
}
