import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
    debugMode: boolean;
    setDebugMode: (debugMode: boolean) => void;
}

export const useAppStore = create<AppStore>()(
    persist(
        (set) => ({
            debugMode: false,

            setDebugMode: (debugMode: boolean) => set({ debugMode }),
        }),
        {
            name: 'app-storage', // unique name for localStorage key
        },
    ),
);
