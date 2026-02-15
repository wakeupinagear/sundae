import clsx from 'clsx';
import React, { useMemo } from 'react';

import { DebugOverlayFlags } from '@repo/engine';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Label } from '@repo/ui/components/ui/label';
import { MultiSelect } from '@repo/ui/components/ui/multi-select';

import { useAppStore } from '../store';

const ALL_DEBUG_OVERLAY_FLAGS = [
    DebugOverlayFlags.STATS,
    DebugOverlayFlags.STATS_FPS,
    DebugOverlayFlags.STATS_TRACES,
    DebugOverlayFlags.STATS_RENDER_COMMANDS,
    DebugOverlayFlags.STATS_PHYSICS,
    DebugOverlayFlags.VISUAL,
    DebugOverlayFlags.VISUAL_COLLIDERS,
    DebugOverlayFlags.VISUAL_BOUNDING_BOXES,
    DebugOverlayFlags.VISUAL_RAYCASTS,
];

type Props = {
    canChangeCameraCount: boolean;
    maxCameras: number;
    scenarioMaxCameras: number;
    scenarioDebugOverlayFlags?: DebugOverlayFlags;
};

export default function HarnessOptions({
    canChangeCameraCount,
    maxCameras,
    scenarioMaxCameras,
    scenarioDebugOverlayFlags = DebugOverlayFlags.NONE,
}: Props) {
    const cameraCount = useAppStore((state) => state.cameraCount);
    const setCameraCount = useAppStore((state) => state.setCameraCount);
    const debugOverlay = useAppStore((state) => state.debugOverlay);
    const setDebugOverlay = useAppStore((state) => state.setDebugOverlay);
    const trueRandom = useAppStore((state) => state.trueRandom);
    const setTrueRandom = useAppStore((state) => state.setTrueRandom);
    const runInWorker = useAppStore((state) => state.runInWorker);
    const setRunInWorker = useAppStore((state) => state.setRunInWorker);

    const scenarioLockedFlags = scenarioDebugOverlayFlags ?? 0;
    const debugOverlayItems = useMemo<DebugOverlayFlags[]>(() => {
        const items: DebugOverlayFlags[] = [];
        const effective = debugOverlay | scenarioLockedFlags;
        for (const flag of ALL_DEBUG_OVERLAY_FLAGS) {
            if (effective & flag) {
                items.push(flag);
            }
        }

        return items;
    }, [debugOverlay, scenarioLockedFlags]);

    return (
        <div className="flex flex-col gap-2 text-sm">
            <div
                className={clsx('flex gap-2 items-center transition-opacity', {
                    'opacity-50': !canChangeCameraCount,
                })}
            >
                <Label
                    htmlFor="cameraCount"
                    className="font-medium text-foreground"
                >
                    Cameras
                </Label>
                <select
                    id="cameraCount"
                    value={Math.max(Math.min(cameraCount, maxCameras), 1)}
                    onChange={(e) => setCameraCount(Number(e.target.value))}
                    disabled={!canChangeCameraCount}
                >
                    {Array(Math.min(scenarioMaxCameras, maxCameras))
                        .fill(0)
                        .map((_, index) => (
                            <option key={index} value={index + 1}>
                                {index + 1}
                            </option>
                        ))}
                </select>
            </div>
            <div className="flex gap-2 items-center">
                <Label htmlFor="debug" className="font-medium text-foreground">
                    Debug
                </Label>
                <MultiSelect<DebugOverlayFlags>
                    items={debugOverlayItems}
                    placeholder="None"
                    className="w-24"
                    disabled={Boolean(
                        scenarioLockedFlags === DebugOverlayFlags.ALL,
                    )}
                    onChange={(_, changedItem, mode) => {
                        if (mode === 'added') {
                            setDebugOverlay(debugOverlay | changedItem);
                        } else {
                            setDebugOverlay(debugOverlay & ~changedItem);
                        }
                    }}
                    content={[
                        { label: 'Stats' },
                        {
                            value: DebugOverlayFlags.STATS_FPS,
                            label: 'FPS',
                        },
                        {
                            value: DebugOverlayFlags.STATS_TRACES,
                            label: 'Traces',
                        },
                        {
                            value: DebugOverlayFlags.STATS_RENDER_COMMANDS,
                            label: 'Render Commands',
                        },
                        {
                            value: DebugOverlayFlags.STATS_PHYSICS,
                            label: 'Physics',
                        },
                        { label: 'Visuals' },
                        {
                            value: DebugOverlayFlags.VISUAL_BOUNDING_BOXES,
                            label: 'Bounding Boxes',
                        },
                        {
                            value: DebugOverlayFlags.VISUAL_COLLIDERS,
                            label: 'Colliders',
                        },
                        {
                            value: DebugOverlayFlags.VISUAL_RAYCASTS,
                            label: 'Raycasts',
                        },
                    ]}
                />
            </div>
            <div className="flex gap-2 items-center">
                <Label
                    htmlFor="trueRandom"
                    className="font-medium text-foreground"
                >
                    True Random
                </Label>
                <Checkbox
                    id="trueRandom"
                    checked={trueRandom}
                    onCheckedChange={(checked) =>
                        setTrueRandom(Boolean(checked))
                    }
                />
            </div>
            <div className="flex gap-2 items-center">
                <Label
                    htmlFor="runInWorker"
                    className="font-medium text-foreground"
                >
                    Run in Worker
                </Label>
                <Checkbox
                    id="runInWorker"
                    checked={runInWorker}
                    onCheckedChange={(checked) =>
                        setRunInWorker(Boolean(checked))
                    }
                />
            </div>
        </div>
    );
}
