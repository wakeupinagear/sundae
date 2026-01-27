import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        {
            name: 'force-reload-on-folder-change',
            handleHotUpdate({ file, server }) {
                const targetDir = path.resolve(__dirname, '../../packages');

                if (file.startsWith(targetDir)) {
                    server.ws.send({
                        type: 'full-reload',
                        path: '*',
                    });
                    return [];
                }
            },
        },
    ],
});
