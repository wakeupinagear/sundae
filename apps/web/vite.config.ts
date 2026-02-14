import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'path';
import { defineConfig } from 'vite';

const ASSETS_DIR = path.resolve(
    __dirname,
    '../../packages/engine-scenarios/assets',
);

export default defineConfig({
    server: {
        fs: {
            allow: ['..'],
        },
    },
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
                const storeIndexDir = path.resolve(__dirname, './src/store.ts');

                if (
                    file.startsWith(packageDir) ||
                    file.startsWith(appIndexDir) ||
                    file.startsWith(storeIndexDir)
                ) {
                    server.ws.send({
                        type: 'full-reload',
                        path: '*',
                    });
                    return [];
                }
            },
        },
        {
            name: 'serve-dev-scenario-assets',
            configureServer(server) {
                server.middlewares.use('/scenario-assets', (req, res, next) => {
                    const urlPath = req.url?.replace(/^\/+/, '') ?? '';
                    const filePath = path.join(ASSETS_DIR, urlPath);

                    if (
                        fs.existsSync(filePath) &&
                        fs.statSync(filePath).isFile()
                    ) {
                        fs.createReadStream(filePath).pipe(res);
                    } else {
                        next();
                    }
                });
            },
        },
        {
            name: 'copy-scenario-assets-to-public',
            apply: 'build',
            buildStart() {
                const targetDir = path.resolve(
                    __dirname,
                    './public/scenario-assets',
                );

                fs.rmSync(targetDir, { recursive: true, force: true });
                fs.mkdirSync(path.dirname(targetDir), { recursive: true });
                fs.cpSync(ASSETS_DIR, targetDir, { recursive: true });
            },
        },
    ],
    base: process.env.GITHUB_PAGES === 'true' ? '/sundae/' : '/',
    build: {
        minify: 'esbuild',
        target: 'esnext',
    },
});
