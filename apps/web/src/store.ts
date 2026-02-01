import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DebugOverlayFlags } from '@repo/engine';

interface AppStore {
    cameraCount: number;
    setCameraCount: (cameraCount: number) => void;
    debugOverlay: DebugOverlayFlags;
    setDebugOverlay: (debugOverlay: DebugOverlayFlags) => void;
    trueRandom: boolean;
    setTrueRandom: (trueRandom: boolean) => void;
}

export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            cameraCount: 1,
            setCameraCount: (cameraCount: number) => set({ cameraCount }),
            debugOverlay: DebugOverlayFlags.NONE,
            setDebugOverlay: (debugOverlay: DebugOverlayFlags) =>
                set({ debugOverlay }),
            trueRandom: false,
            setTrueRandom: (trueRandom: boolean) => set({ trueRandom }),
        }),
        {
            name: 'app-storage', // unique name for localStorage key
        },
    ),
);
