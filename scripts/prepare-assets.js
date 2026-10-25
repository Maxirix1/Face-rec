import { access, copyFile, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROJECT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_NAMES = ['tiny_face_detector', 'face_landmark_68', 'face_recognition'];

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function findFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function resolveWithin(directory, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath || path.isAbsolute(relativePath)) {
    throw new Error('Invalid model shard path in package manifest.');
  }
  const result = path.resolve(directory, relativePath);
  const relative = path.relative(directory, result);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Model shard path escapes its model directory.');
  }
  return result;
}

/** Copy the browser bundle and the three networks used by the demo from npm. */
export async function prepareAssets({
  projectDir = PROJECT_DIR,
  packageDir = path.join(projectDir, 'node_modules', '@vladmandic', 'face-api'),
} = {}) {
  const bundle = path.join(packageDir, 'dist', 'face-api.esm.js');
  if (!await exists(bundle)) {
    throw new Error('face-api is not installed. Run "npm install --ignore-scripts", then try again.');
  }
  const modelDirectory = (await Promise.all(['model', 'models', 'weights'].map(async name => {
    const candidate = path.join(packageDir, name);
    return await exists(candidate) ? candidate : null;
  }))).find(Boolean);
  if (!modelDirectory) throw new Error('Installed face-api package is missing its model directory. Reinstall dependencies.');

  const modelFiles = await findFiles(modelDirectory);
  const vendorDirectory = path.join(projectDir, 'public', 'vendor');
  const targetModels = path.join(projectDir, 'public', 'models');
  const filesToCopy = new Map([[path.join(vendorDirectory, 'face-api.esm.js'), bundle]]);
  for (const name of MODEL_NAMES) {
    const manifestFile = modelFiles.find(file =>
      path.basename(file).replace(/(?:_model)?[-_]weights_manifest\.json$/, '') === name);
    if (!manifestFile) throw new Error(`Installed face-api package is missing the ${name} manifest.`);
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    if (!Array.isArray(manifest) || !manifest.length) throw new Error(`Invalid ${name} model manifest.`);
    filesToCopy.set(path.join(targetModels, path.basename(manifestFile)), manifestFile);
    for (const group of manifest) {
      if (!Array.isArray(group.paths) || !group.paths.length) throw new Error(`Missing shard paths in ${name} manifest.`);
      for (const shard of group.paths) {
        const source = resolveWithin(path.dirname(manifestFile), shard);
        const target = resolveWithin(targetModels, shard);
        if (!(await stat(source)).isFile()) throw new Error(`Missing model shard: ${shard}`);
        filesToCopy.set(target, source);
      }
    }
  }
  for (const [source, destination] of [
    [path.join(packageDir, 'dist', 'face-api.esm.js.map'), path.join(vendorDirectory, 'face-api.esm.js.map')],
    [path.join(packageDir, 'LICENSE'), path.join(vendorDirectory, 'face-api-LICENSE.txt')],
  ]) {
    if (await exists(source)) filesToCopy.set(destination, source);
  }
  for (const [target, source] of filesToCopy) {
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  return { copiedFiles: filesToCopy.size, models: [...MODEL_NAMES] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  prepareAssets()
    .then(result => console.log(`Prepared ${result.copiedFiles} local files (${result.models.join(', ')}).`))
    .catch(error => { console.error(`Asset preparation failed: ${error.message}`); process.exitCode = 1; });
}
