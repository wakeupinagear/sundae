import type { Platform } from '@repo/engine';

const PLATFORM_MATCHES: Record<Platform, string[]> = {
    windows: ['windows'],
    macos: ['macos', 'macintosh'],
    linux: ['linux'],
    android: ['android'],
    ios: ['ios'],
    unknown: [],
};

export const getPlatform = (): Platform => {
    if (typeof window === 'undefined') {
        return 'unknown';
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    for (const [platform, matches] of Object.entries(PLATFORM_MATCHES)) {
        if (matches.some((match) => userAgent.includes(match))) {
            return platform as Platform;
        }
    }

    return 'unknown';
};
