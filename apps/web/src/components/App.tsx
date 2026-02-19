import { Maximize2, Minimize2, Monitor, Moon, Sun } from 'lucide-react';
import {
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    DebugOverlayFlags,
    type Engine,
    type EngineOptions,
} from '@repo/engine';
import { ENGINE_SCENARIOS } from '@repo/engine-scenarios';
import { PointerButton } from '@repo/engine/pointer';
import type { EngineWrapper } from '@repo/engine/wrapper';
import { Harness } from '@repo/react';
import { ThemeProvider, useTheme } from '@repo/ui/components/ThemeProvider';
import { Button } from '@repo/ui/components/ui/button';

import { useAppStore } from '../store';
import { WebHarness } from '../utils/harness';
import { idToScenario, scenarioToID } from '../utils/scenarios';
import type { ExtendedToEngineMsg } from '../utils/types';
import EngineWorker from '../utils/worker?worker';
import { ExampleList, ExampleSearchBar } from './ExampleList';
import HarnessOptions from './HarnessOptions';

const DEFAULT_SCENARIO = 'stressTests-renderChaos';
const MAX_CAMERAS = 64;

const INITIAL_ENGINE_OPTIONS: Partial<EngineOptions> = {
    cameraOptions: {
        clearColor: '#111111',
        canDrag: true,
        dragButtons: [
            PointerButton.LEFT,
            PointerButton.MIDDLE,
            PointerButton.RIGHT,
        ],
        bounds: {
            x1: -400,
            x2: 400,
            y1: -300,
            y2: 300,
        },
        scrollMode: 'all',
    },
    canvasClearColor: 'aqua',
};

const readScenarioFromHash = () => {
    return idToScenario(window.location.hash.slice(1) || DEFAULT_SCENARIO);
};

type NormalizedRect = {
    offset: { x: number; y: number };
    scale: { x: number; y: number };
};

const makeGridCameras = (
    count: number,
    hash: number,
): Record<string, NormalizedRect> => {
    if (count <= 1) {
        return {
            [`camera-0-${hash}`]: {
                offset: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
            },
        };
    }

    const cols = Math.ceil(Math.sqrt(count));
    const fullRows = Math.floor(count / cols);
    const remainder = count - fullRows * cols;
    const totalRows = fullRows + (remainder > 0 ? 1 : 0);
    const cameras: Record<string, NormalizedRect> = {};
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const isRemainderRow = remainder > 0 && row === fullRows;
        const rowWidth = isRemainderRow ? remainder : cols;
        const col = isRemainderRow ? i - fullRows * cols : i % cols;
        cameras[`camera-${i}-${hash}`] = {
            offset: { x: col / rowWidth, y: row / totalRows },
            scale: { x: 1 / rowWidth, y: 1 / totalRows },
        };
    }

    return cameras;
};

const THEME_CYCLE = ['system', 'light', 'dark'] as const;

function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const next =
        THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
    return (
        <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(next)}
            title={`Theme: ${theme} (click for ${next})`}
            type="button"
        >
            <Icon className="size-4" />
        </Button>
    );
}

export function App() {
    const cameraCount = useAppStore((state) => state.cameraCount);
    const debugOverlay = useAppStore((state) => state.debugOverlay);
    const trueRandom = useAppStore((state) => state.trueRandom);
    const runInWorker = useAppStore((state) => state.runInWorker);

    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);

    const [[categoryID, scenarioID], setScenario] =
        useState<[string, string]>(readScenarioFromHash);
    useEffect(() => {
        const onHashChange = () => {
            setScenario(readScenarioFromHash());
        };
        window.addEventListener('hashchange', onHashChange);

        return () => {
            window.removeEventListener('hashchange', onHashChange);
        };
    }, []);

    const {
        scenario,
        scenarioKey,
        maxCameras,
        canChangeCameraCount,
        scenarioDebugOverlayFlags,
    } = useMemo(() => {
        const scenario =
            ENGINE_SCENARIOS[categoryID]?.scenarios[scenarioID] || null;
        const scenarioKey = scenarioToID(categoryID, scenarioID);
        const url = new URL(window.location.href);
        url.hash = scenarioKey;
        window.history.replaceState({}, '', url.toString());

        const maxCameras = scenario?.maxCameras ?? MAX_CAMERAS;

        return {
            scenario,
            scenarioKey,
            maxCameras,
            canChangeCameraCount: maxCameras > 1,
            scenarioDebugOverlayFlags: scenario?.debugOverlayFlags,
        };
    }, [categoryID, scenarioID]);

    const prevCamerasRef = useRef<number[]>([-1, -1]);
    const cameraHash = useRef<number>(0);
    const stylePropertyValuePreloads = scenario?.stylePropertyValuePreloads;
    const engineOptions = useMemo<Partial<EngineOptions>>(() => {
        if (
            prevCamerasRef.current[0] !== cameraCount ||
            prevCamerasRef.current[1] !== maxCameras
        ) {
            prevCamerasRef.current = [cameraCount, maxCameras];
            cameraHash.current = (Math.random() * 2 ** 32) >>> 0;
        }
        const scenarioLockedFlags = scenarioDebugOverlayFlags ?? 0;
        const activeDebugOverlay = scenarioLockedFlags | debugOverlay;
        const options: Partial<EngineOptions> = {
            cameras: makeGridCameras(
                Math.min(cameraCount, maxCameras),
                cameraHash.current,
            ),
            debugOverlay: activeDebugOverlay,
            engineTraces: Boolean(
                activeDebugOverlay & DebugOverlayFlags.STATS_TRACES,
            ),
            randomSeed: trueRandom
                ? (Math.random() * 2 ** 32) >>> 0
                : undefined,
            stylePropertyValuePreloads,
        };

        return options;
    }, [
        debugOverlay,
        scenarioDebugOverlayFlags,
        trueRandom,
        cameraCount,
        maxCameras,
        stylePropertyValuePreloads,
    ]);

    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const engineWrapperRef = useRef<EngineWrapper<
        Engine,
        ExtendedToEngineMsg
    > | null>(null);

    const [isFullscreen, setIsFullscreen] = useState(false);
    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(
                document.fullscreenElement === canvasContainerRef.current,
            );
            window.dispatchEvent(new Event('resize'));
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);

        return () =>
            document.removeEventListener(
                'fullscreenchange',
                onFullscreenChange,
            );
    }, []);

    const toggleFullscreen = useCallback(() => {
        const el = canvasContainerRef.current;
        if (!el) return;

        if (document.fullscreenElement === el) {
            document.exitFullscreen();
        } else {
            el.requestFullscreen();
        }
    }, []);

    // Non-worker version
    const onEngineReady = useCallback(
        (engine: Engine) => {
            if (scenario) {
                const harness = new WebHarness(engine);
                scenario.run(harness);
            }
        },
        [scenario],
    );

    // Worker version
    useEffect(() => {
        if (runInWorker) {
            engineWrapperRef.current?.sendMessage({
                type: 'scenario',
                categoryID,
                scenarioID,
            });
        }
    }, [runInWorker, categoryID, scenarioID]);

    return (
        <ThemeProvider>
            <div className="flex items-stretch h-screen overflow-hidden">
                <aside className="flex flex-col gap-2 h-screen min-h-0 w-32 sm:w-48 xs:w-56 lg:w-64 shrink-0 bg-background p-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-primary">🍨 Sundae</h1>
                        <ThemeToggle />
                    </div>
                    <ExampleSearchBar value={search} onChange={setSearch} />
                    <div className="min-h-0 flex-1 overflow-y-auto w-full scrollbar-styled">
                        <ExampleList
                            search={deferredSearch}
                            selectedCategoryID={categoryID}
                            selectedScenarioID={scenarioID}
                        />
                    </div>
                    <div className="shrink-0">
                        <HarnessOptions
                            canChangeCameraCount={canChangeCameraCount}
                            maxCameras={MAX_CAMERAS}
                            scenarioMaxCameras={maxCameras}
                            scenarioDebugOverlayFlags={
                                scenario?.debugOverlayFlags
                            }
                        />
                    </div>
                </aside>
                <main
                    className="relative size-full overflow-hidden bg-black"
                    ref={canvasContainerRef}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 z-10 size-9 rounded-md bg-black/50 text-white hover:bg-black/70"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        type="button"
                    >
                        {isFullscreen ? (
                            <Minimize2 className="size-[18px]" />
                        ) : (
                            <Maximize2 className="size-[18px]" />
                        )}
                    </Button>
                    <Harness
                        key={`${scenarioKey}-${runInWorker}`}
                        containerRef={canvasContainerRef}
                        engineWrapperRef={engineWrapperRef}
                        initialEngineOptions={INITIAL_ENGINE_OPTIONS}
                        engineOptions={engineOptions}
                        onEngineReady={onEngineReady}
                        runInWorker={runInWorker}
                        workerConstructor={EngineWorker}
                    />
                </main>
            </div>
        </ThemeProvider>
    );
}
