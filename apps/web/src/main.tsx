import { createRoot } from 'react-dom/client';

import { Engine } from '@repo/engine';

import { EngineCanvas } from './EngineCanvas';
import { TestScene } from './scenes/test';
import './style.css';

function App() {
    return (
        <div className="p-4 flex flex-col items-center justify-center gap-4">
            <h1>Engine Test</h1>
            <EngineCanvas
                engine={Engine}
                engineOptions={{
                    startScenes: [TestScene],
                }}
                width={800}
                height={600}
            />
        </div>
    );
}

createRoot(document.getElementById('app')!).render(<App />);
