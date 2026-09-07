import { mkdir, rm, copyFile, cp } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
for (const page of ['streamer.html', 'overlay.html', '404.html', 'favicon.ico', 'robots.txt', 'sitemap.xml']) await copyFile(page, 'dist/' + page);
await cp('assets', 'dist/assets', { recursive: true });
await cp('controller', 'dist/controller', { recursive: true });
