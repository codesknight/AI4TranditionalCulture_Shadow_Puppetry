import { readFile, readdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
async function checkDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) await checkDirectory(url);
    else if (/\.(js|cjs|mjs)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', fileURLToPath(url)], {
        stdio: 'inherit',
      });
      if (result.status !== 0) throw new Error(`Syntax check failed: ${entry.name}`);
    }
  }
}
for (const directory of ['demo/', 'scripts/', 'tests/'])
  await checkDirectory(new URL(directory, root));
const html = await readFile(new URL('demo/index.html', root), 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) {
  if (/^(?:https?:|data:|\.\/$)/.test(match[1])) continue;
  await access(new URL(match[1], new URL('demo/', root)));
}
console.log('JavaScript syntax and local HTML asset references verified.');
