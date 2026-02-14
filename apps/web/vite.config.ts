import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
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
                const scenarioAssetsHandler = (
                    req: IncomingMessage,
                    res: ServerResponse,
                    next: () => void,
                ) => {
                    const url = req.url ?? '';
                    const urlPath = url
                        .replace(/^\/scenario-assets\/?/, '')
                        .replace(/^\/+/, '');
                    if (!urlPath) {
                        next();
                        return;
                    }
                    const filePath = path.join(ASSETS_DIR, urlPath);

                    if (
                        !fs.existsSync(filePath) ||
                        !fs.statSync(filePath).isFile()
                    ) {
                        next();
                        return;
                    }

                    const ext = path.extname(filePath).toLowerCase();
                    const contentTypes: Record<string, string> = {
                        '.svg': 'image/svg+xml',
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg',
                        '.webp': 'image/webp',
                        '.json': 'application/json',
                    };
                    const contentType = contentTypes[ext];
                    if (contentType) {
                        res.setHeader('Content-Type', contentType);
                    }

                    fs.createReadStream(filePath).pipe(res);
                };

                // Run before Vite's transform middleware so .svg (and other assets)
                // are served as raw files instead of being intercepted and
                // returned empty or as transformed modules.
                (
                    server.middlewares as {
                        stack: Array<{ route: string; handle: unknown }>;
                    }
                ).stack.unshift({
                    route: '/scenario-assets',
                    handle: scenarioAssetsHandler,
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
