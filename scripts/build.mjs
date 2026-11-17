import { mkdir, cp, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('dist/', root), { recursive: true });
await cp(new URL('demo/', root), new URL('dist/', root), { recursive: true });
// Remove the previous entry point so old deploy artifacts cannot mask missing references.
await rm(new URL('dist/app.js', root), { force: true });
console.log('Static demo ready in dist/');
