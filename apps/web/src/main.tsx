import { useRef } from 'react';
import { createRoot } from 'react-dom/client';

import { Engine } from '@repo/engine';

import { EngineCanvas } from './EngineCanvas';
import { TestScene } from './scenes/test';
import './style.css';

function App() {
    const engineRef = useRef<Engine>(null);
    if (!engineRef.current) {
        engineRef.current = new Engine({
            startScenes: [TestScene],
            debugOverlayEnabled: true,
        });
    }

    return (
        <div className="p-4 flex flex-col items-center justify-center gap-4">
            <h1>Engine Test</h1>
            <EngineCanvas engineRef={engineRef} width={800} height={600} />
        </div>
    );
}

createRoot(document.getElementById('app')!).render(<App />);
