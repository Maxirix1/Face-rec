import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESCRIPTOR_SIZE, SAMPLES_PER_PERSON, STORAGE_KEY,
  validateDescriptor, normalizeName, createProfile,
  readProfiles, writeProfiles, removeProfiles,
  matchDescriptor, evaluateEnrollmentSample,
} from '../src/lib/profiles.js';

const descriptor = (position = 0) => [position, ...Array(DESCRIPTOR_SIZE - 1).fill(0)];
const samples = (position = 0) => Array.from({ length: SAMPLES_PER_PERSON }, () => descriptor(position));
const profile = (name = 'Alice', position = 0) => createProfile(name, samples(position));

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('descriptors accept typed vectors and reject wrong length or nonfinite values', () => {
  const input = new Float32Array(DESCRIPTOR_SIZE);
  assert.deepEqual(validateDescriptor(input), descriptor());
  const copy = validateDescriptor(input);
  copy[0] = 1;
  assert.equal(input[0], 0);
  for (const invalid of [[], null, {}, Array(128).fill(NaN), Array(128).fill(Infinity), Array(128).fill('0')]) {
    assert.throws(() => validateDescriptor(invalid), TypeError);
  }
});

test('profile creation normalizes names, copies samples, and rejects duplicate names', () => {
  assert.equal(normalizeName('  สมชาย   ใจดี \n'), 'สมชาย ใจดี');
  assert.throws(() => normalizeName('  '));
  assert.throws(() => normalizeName('a'.repeat(61)));
  const input = samples();
  const alice = createProfile(' Alice ', input);
  assert.equal(alice.name, 'Alice');
  assert.ok(alice.id);
  assert.ok(Number.isFinite(Date.parse(alice.createdAt)));
  input[0][0] = 99;
  assert.equal(alice.descriptors[0][0], 0);
  assert.throws(() => createProfile(' aLiCe ', samples(), [alice]), /already exists/);
  assert.throws(() => createProfile('Bob', samples().slice(1)), /exactly 3/);
});

test('matching finds known profiles and leaves unrelated or absent profiles unknown', () => {
  const alice = profile();
  const bob = profile('Bob', 2);
  const found = matchDescriptor(descriptor(2.1), [alice, bob]);
  assert.equal(found.id, bob.id);
  assert.equal(found.name, 'Bob');
  assert.equal(found.matched, true);
  assert.ok(Math.abs(found.distance - 0.1) < 1e-10);
  assert.deepEqual(matchDescriptor(descriptor(), []), { id: null, name: 'Unknown', distance: Infinity, matched: false });
  const unknown = matchDescriptor(descriptor(5), [alice, bob]);
  assert.equal(unknown.matched, false);
  assert.equal(unknown.id, null);
  assert.equal(unknown.name, 'Unknown');
  assert.equal(unknown.distance, 3);
});

test('recognition uses mean distance and includes the threshold boundary', () => {
  const alice = createProfile('Alice', [descriptor(0), descriptor(0.3), descriptor(0.6)]);
  assert.ok(Math.abs(matchDescriptor(descriptor(), [alice]).distance - 0.3) < 1e-10);
  const exact = profile();
  assert.equal(matchDescriptor(descriptor(0.5), [exact], 0.5).matched, true);
  assert.equal(matchDescriptor(descriptor(0.50001), [exact], 0.5).matched, false);
  assert.equal(matchDescriptor(descriptor(), [exact], 0).matched, true);
  for (const threshold of [-1, NaN, Infinity, '0.5']) {
    assert.throws(() => matchDescriptor(descriptor(), [exact], threshold), /threshold/);
  }
});

test('storage round trips profiles and only removes the application key', () => {
  const storage = memoryStorage();
  const profiles = [profile()];
  storage.setItem('other-app', 'keep');
  assert.deepEqual(readProfiles(storage), []);
  writeProfiles(profiles, storage);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, 1);
  assert.deepEqual(readProfiles(storage), profiles);
  removeProfiles(storage);
  assert.deepEqual(readProfiles(storage), []);
  assert.equal(storage.getItem('other-app'), 'keep');
});

test('invalid or corrupt storage is reported and preserved', () => {
  const storage = memoryStorage();
  const valid = profile();
  const malformed = [
    '{bad json', '', 'null', '[]',
    JSON.stringify({ version: 2, profiles: [] }),
    JSON.stringify({ version: 1, profiles: [{ ...valid, descriptors: [[0]] }] }),
    JSON.stringify({ version: 1, profiles: [{ ...valid, createdAt: 'yesterday' }] }),
    JSON.stringify({ version: 1, profiles: [valid, { ...valid, id: 'another', name: 'ALICE' }] }),
    JSON.stringify({ version: 1, profiles: [valid, { ...valid, name: 'Bob' }] }),
  ];
  for (const raw of malformed) {
    storage.setItem(STORAGE_KEY, raw);
    assert.throws(() => readProfiles(storage), /invalid.*preserved/i);
    assert.equal(storage.getItem(STORAGE_KEY), raw);
  }
});

test('failed persistence surfaces an error and validation cannot overwrite stored data', () => {
  const storage = memoryStorage();
  const profiles = [profile()];
  writeProfiles(profiles, storage);
  const saved = storage.getItem(STORAGE_KEY);
  assert.throws(() => writeProfiles([{ ...profiles[0], descriptors: [] }], storage));
  assert.equal(storage.getItem(STORAGE_KEY), saved);
  assert.throws(() => writeProfiles(profiles, {
    setItem() { throw new Error('Quota exceeded'); },
  }), /Unable to save.*Quota exceeded/);
  assert.throws(() => readProfiles({
    getItem() { throw new Error('Access denied'); },
  }), /Unable to read.*Access denied/);
  assert.throws(() => removeProfiles({
    removeItem() { throw new Error('Access denied'); },
  }), /Unable to remove.*Access denied/);
  assert.throws(() => readProfiles(null), /unavailable/);
});

test('enrollment rejects switched people and already enrolled faces', () => {
  assert.deepEqual(evaluateEnrollmentSample(descriptor(0.2), [descriptor()], []), { ok: true, reason: null });
  assert.deepEqual(evaluateEnrollmentSample(descriptor(0.56), [descriptor()], []), { ok: false, reason: 'person_changed' });
  assert.equal(evaluateEnrollmentSample(descriptor(0.55), [descriptor()], []).ok, true);
  const existing = [profile()];
  assert.deepEqual(evaluateEnrollmentSample(descriptor(0.44), [], existing), { ok: false, reason: 'already_enrolled' });
  assert.equal(evaluateEnrollmentSample(descriptor(0.45), [], existing).ok, true);
  assert.deepEqual(evaluateEnrollmentSample([], [], []), { ok: false, reason: 'invalid_descriptor' });
  assert.deepEqual(evaluateEnrollmentSample(descriptor(), [[]], []), { ok: false, reason: 'invalid_samples' });
});
