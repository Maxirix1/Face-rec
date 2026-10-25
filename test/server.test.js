import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createStaticServer } from '../scripts/server.js';
import { prepareAssets } from '../scripts/prepare-assets.js';

async function tempDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'face-reg-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function serveFixture(t) {
  const directory = await tempDirectory(t);
  const publicDir = path.join(directory, 'public');
  await mkdir(path.join(publicDir, 'js'), { recursive: true });
  await mkdir(path.join(publicDir, 'models'), { recursive: true });
  await writeFile(path.join(publicDir, 'index.html'), '<h1>Face Reg</h1>');
  await writeFile(path.join(publicDir, 'js', 'app.js'), 'export const ready = true;');
  await writeFile(path.join(publicDir, 'models', 'weights.bin'), Buffer.from([0, 127, 255]));
  await writeFile(path.join(publicDir, 'models', 'manifest.json'), '[]');
  await writeFile(path.join(publicDir, '.env'), 'PRIVATE=hidden');
  await writeFile(path.join(directory, 'secret.txt'), 'outside public');
  const server = createStaticServer({ publicDir });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const port = server.address().port;
  const get = (urlPath, method = 'GET') => new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: urlPath, method }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('error', reject);
    req.end();
  });
  return { get, publicDir, directory };
}

test('serves the home page, JS, JSON, binary models, and HEAD requests', async t => {
  const { get } = await serveFixture(t);
  const home = await get('/');
  assert.equal(home.status, 200);
  assert.match(home.body.toString(), /Face Reg/);
  assert.match(home.headers['content-type'], /text\/html/);
  assert.equal(home.headers['x-content-type-options'], 'nosniff');
  const js = await get('/js/app.js?version=1');
  assert.equal(js.status, 200);
  assert.match(js.headers['content-type'], /javascript/);
  assert.match(js.body.toString(), /ready/);
  const manifest = await get('/models/manifest.json');
  assert.match(manifest.headers['content-type'], /application\/json/);
  const model = await get('/models/weights.bin');
  assert.equal(model.headers['content-type'], 'application/octet-stream');
  assert.deepEqual(model.body, Buffer.from([0, 127, 255]));
  const head = await get('/', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), home.body.length);
});

test('rejects raw/encoded traversal, hidden files, Windows separators, and invalid paths', async t => {
  const { get } = await serveFixture(t);
  for (const urlPath of [
    '/../secret.txt', '/%2e%2e/secret.txt', '/..%2fsecret.txt',
    '/js/%2e%2e/index.html', '/.env', '/%2eenv', '/%2Egit/config',
    '/%5c..%5csecret.txt', '/index.html%3ahidden', '/index.html.',
  ]) {
    const result = await get(urlPath);
    assert.equal(result.status, 403, urlPath);
    assert.doesNotMatch(result.body.toString(), /PRIVATE=|outside public/);
  }
  for (const urlPath of ['/%', '/%00', '/%ED%A0%80']) {
    assert.equal((await get(urlPath)).status, 400, urlPath);
  }
});

test('does not serve directory listings or unsupported request methods', async t => {
  const { get } = await serveFixture(t);
  assert.equal((await get('/js/')).status, 404);
  assert.equal((await get('/not-present.txt')).status, 404);
  const post = await get('/', 'POST');
  assert.equal(post.status, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');
});

test('explains how to restore missing local library and model assets', async t => {
  const { get } = await serveFixture(t);
  for (const urlPath of ['/vendor/face-api.esm.js', '/models/missing.bin']) {
    const response = await get(urlPath);
    assert.equal(response.status, 503);
    assert.match(response.body.toString(), /npm run prepare:assets/);
  }
});

test('blocks symlinks that point outside the public directory', async t => {
  const { get, publicDir, directory } = await serveFixture(t);
  try {
    await symlink(path.join(directory, 'secret.txt'), path.join(publicDir, 'escape.txt'));
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      t.skip('This Windows account cannot create test symlinks.');
      return;
    }
    throw error;
  }
  assert.equal((await get('/escape.txt')).status, 403);
});

test('asset preparation copies only the requested model manifests and their declared shards', async t => {
  const projectDir = await tempDirectory(t);
  const packageDir = path.join(projectDir, 'fixture-package');
  const modelDir = path.join(packageDir, 'model');
  await mkdir(modelDir, { recursive: true });
  await mkdir(path.join(packageDir, 'dist'), { recursive: true });
  await writeFile(path.join(packageDir, 'dist', 'face-api.esm.js'), '// local bundle');
  await writeFile(path.join(packageDir, 'LICENSE'), 'MIT test fixture');
  const names = ['tiny_face_detector', 'face_landmark_68', 'face_recognition'];
  const expected = [];
  for (const [index, name] of names.entries()) {
    const manifest = `${name}_model-weights_manifest.json`;
    const shard = `shard-${index}.bin`;
    await writeFile(path.join(modelDir, manifest), JSON.stringify([{ paths: [shard], weights: [] }]));
    await writeFile(path.join(modelDir, shard), `weights-${index}`);
    expected.push(manifest, shard);
  }
  await writeFile(path.join(modelDir, 'unused-large-model.bin'), 'unused');
  await writeFile(path.join(modelDir, 'face_landmark_68_tiny_model-weights_manifest.json'), '[]');
  const result = await prepareAssets({ projectDir, packageDir });
  assert.deepEqual(result.models, names);
  assert.deepEqual((await readdir(path.join(projectDir, 'public', 'models'))).sort(), expected.sort());
  assert.equal(await readFile(path.join(projectDir, 'public', 'vendor', 'face-api.esm.js'), 'utf8'), '// local bundle');
  assert.equal(await readFile(path.join(projectDir, 'public', 'models', 'shard-2.bin'), 'utf8'), 'weights-2');
});

test('asset preparation gives an actionable error when dependencies are absent', async t => {
  const projectDir = await tempDirectory(t);
  await assert.rejects(prepareAssets({ projectDir }), /npm install --ignore-scripts/);
});
