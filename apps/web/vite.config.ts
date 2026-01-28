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
                const packageDir = path.resolve(__dirname, '../../packages');
                const appIndexDir = path.resolve(
                    __dirname,
                    './src/components/App.tsx',
                );

                if (
                    file.startsWith(packageDir) ||
                    file.startsWith(appIndexDir)
                ) {
                    server.ws.send({
                        type: 'full-reload',
                        path: '*',
                    });
                    return [];
                }
            },
        },
    ],
    base: process.env.GITHUB_PAGES === 'true' ? '/sundae/' : '/',
});
