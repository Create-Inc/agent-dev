
    import { fork } from 'node:child_process';
    import { fileURLToPath } from 'node:url';
    import { dirname, join } from 'node:path';
    const dir = dirname(fileURLToPath(import.meta.url));
    console.log('parent pid', process.pid);
    fork(join(dir, 'child-proc.mjs'));
  