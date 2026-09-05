import { mkdir, rm, copyFile, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
const files = JSON.parse(await readFile(new URL('./public-files.json', import.meta.url), 'utf8'));
await rm('dist', { recursive: true, force: true });
for (const file of files) {
  await mkdir(dirname('dist/' + file), { recursive: true });
  await copyFile(file, 'dist/' + file);
}
