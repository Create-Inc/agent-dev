import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = dirname(fileURLToPath(import.meta.url));

console.log('parent started, pid', process.pid);
const child = fork(join(dir, 'fixture-child.mjs'));
console.log('child spawned, pid', child.pid);
