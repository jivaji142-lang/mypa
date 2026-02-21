import { build as esbuild } from 'esbuild';
import { build as viteBuild } from 'vite';

async function buildElectron() {
  // Set ELECTRON env so vite.config.ts uses base: './' for file:// protocol
  process.env.ELECTRON = 'true';

  console.log('Building React client with Vite...');
  await viteBuild();

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

  console.log('Electron build complete!');
}

buildElectron().catch((err) => {
  console.error(err);
  process.exit(1);
});
