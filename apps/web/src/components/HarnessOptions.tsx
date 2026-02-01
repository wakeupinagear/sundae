import clsx from 'clsx';
import React from 'react';

import { useAppStore } from '../store';

type Props = {
    canChangeCameraCount: boolean;
    maxCameras: number;
    scenarioMaxCameras: number;
};

export default function HarnessOptions({
    canChangeCameraCount,
    maxCameras,
    scenarioMaxCameras,
}: Props) {
    const cameraCount = useAppStore((state) => state.cameraCount);
    const setCameraCount = useAppStore((state) => state.setCameraCount);
    const debugMode = useAppStore((state) => state.debugMode);
    const setDebugMode = useAppStore((state) => state.setDebugMode);
    const trueRandom = useAppStore((state) => state.trueRandom);
    const setTrueRandom = useAppStore((state) => state.setTrueRandom);

    return (
        <div className="flex flex-col gap-2 p-2">
            <div
                className={clsx('flex gap-2 items-center transition-opacity', {
                    'opacity-50': !canChangeCameraCount,
                })}
            >
                <label htmlFor="cameraCount" className="font-medium">
                    Cameras
                </label>
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
                <label htmlFor="debug" className="font-medium">
                    Debug Mode
                </label>
                <input
                    type="checkbox"
                    id="debug"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                />
            </div>
            <div className="flex gap-2 items-center">
                <label htmlFor="trueRandom" className="font-medium">
                    True Random
                </label>
                <input
                    type="checkbox"
                    id="trueRandom"
                    checked={trueRandom}
                    onChange={(e) => setTrueRandom(e.target.checked)}
                />
            </div>
        </div>
    );
}
