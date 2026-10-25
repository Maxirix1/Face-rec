import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { prepareAssets, PROJECT_DIR } from './prepare-assets.js';

function runViteBuild() {
  const viteCli = path.join(PROJECT_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [viteCli, 'build'], {
      cwd: PROJECT_DIR,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`vite build exited with code ${code}`));
    });
  });
}

try {
  await prepareAssets();
  await runViteBuild();
  await access(path.join(PROJECT_DIR, 'dist', 'index.html'));
  console.log('Build complete: dist/ contains the React app, library, and required models.');
  console.log('Serve dist/ over localhost or HTTPS; opening index.html directly cannot use the camera.');
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
}
