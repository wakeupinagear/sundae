import { createRoot } from 'react-dom/client';

import '@repo/ui/globals.css';

import { App } from './components/App';
import './style.css';

createRoot(document.getElementById('app')!).render(<App />);
