import { build as esbuild } from 'esbuild';
import { spawn } from 'child_process';
import { resolve } from 'path';

async function devElectron() {
  console.log('Compiling Electron main process...');
  await esbuild({
    entryPoints: ['electron/main.ts'],
    platform: 'node',
    bundle: true,
    format: 'cjs',
    outfile: 'dist-electron/main.cjs',
    external: ['electron'],
    logLevel: 'info',
  });

  console.log('Compiling Electron preload script...');
  await esbuild({
    entryPoints: ['electron/preload.ts'],
    platform: 'node',
    bundle: true,
    format: 'cjs',
    outfile: 'dist-electron/preload.cjs',
    external: ['electron'],
    logLevel: 'info',
  });

  console.log('Launching Electron in dev mode...');
  const electronPath = resolve('node_modules/.bin/electron');
  const child = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });
}

devElectron().catch((err) => {
  console.error(err);
  process.exit(1);
});
