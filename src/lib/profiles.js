/** Browser-independent validation, matching, and local profile persistence. */
export const DESCRIPTOR_SIZE = 128;
export const SAMPLES_PER_PERSON = 3;
export const STORAGE_KEY = 'face-reg.profiles.v1';
const SCHEMA_VERSION = 1;

export function validateDescriptor(input) {
  const isSequence = Array.isArray(input) || (ArrayBuffer.isView(input) && !(input instanceof DataView));
  if (!isSequence || input.length !== DESCRIPTOR_SIZE) {
    throw new TypeError(`A face descriptor must contain exactly ${DESCRIPTOR_SIZE} numbers.`);
  }
  const descriptor = Array.from(input);
  if (!descriptor.every((value) => typeof value === 'number' && Number.isFinite(value))) {
    throw new TypeError('Face descriptors must contain only finite numbers.');
  }
  return descriptor;
}

export function normalizeName(name) {
  if (typeof name !== 'string') throw new TypeError('A profile name must be text.');
  const normalized = name.trim().replace(/\s+/gu, ' ');
  if (!normalized || Array.from(normalized).length > 60) {
    throw new TypeError('A profile name must contain between 1 and 60 characters.');
  }
  return normalized;
}

function validateSamples(samples) {
  if (!Array.isArray(samples) || samples.length !== SAMPLES_PER_PERSON) {
    throw new TypeError(`A profile must contain exactly ${SAMPLES_PER_PERSON} face samples.`);
  }
  return samples.map(validateDescriptor);
}

function normalizedNameKey(name) {
  return normalizeName(name).normalize('NFC').toLocaleLowerCase('en-US');
}

function validateProfiles(profiles) {
  if (!Array.isArray(profiles)) throw new TypeError('Face profiles must be an array.');
  const names = new Set();
  const ids = new Set();
  return profiles.map((profile) => {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      throw new TypeError('Each face profile must be an object.');
    }
    const { id, createdAt } = profile;
    const name = normalizeName(profile.name);
    const key = normalizedNameKey(name);
    if (typeof id !== 'string' || !id.trim() || id.length > 100 || ids.has(id)) {
      throw new TypeError('Each profile must have a unique, nonempty ID.');
    }
    if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) {
      throw new TypeError('Each profile must have a valid creation date.');
    }
    if (names.has(key)) throw new TypeError('A profile with this name already exists.');
    ids.add(id);
    names.add(key);
    return { id, name, descriptors: validateSamples(profile.descriptors), createdAt };
  });
}

export function createProfile(name, samples, existingProfiles = []) {
  const normalized = normalizeName(name);
  const existing = validateProfiles(existingProfiles);
  if (existing.some((profile) => normalizedNameKey(profile.name) === normalizedNameKey(normalized))) {
    throw new TypeError('A profile with this name already exists.');
  }
  const descriptors = validateSamples(samples);
  const id = globalThis.crypto?.randomUUID?.()
    ?? `face-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return { id, name: normalized, descriptors, createdAt: new Date().toISOString() };
}

/** Build the fixed sample count from one or more face descriptors (pads by repeating). */
export function samplesFromDescriptors(descriptors) {
  const list = (Array.isArray(descriptors) ? descriptors : [descriptors]).map(validateDescriptor);
  if (!list.length) throw new TypeError('At least one face descriptor is required.');
  const samples = [];
  for (let i = 0; i < SAMPLES_PER_PERSON; i += 1) {
    samples.push(list[i % list.length]);
  }
  return samples;
}

function requireStorage(storage, method) {
  if (!storage || typeof storage[method] !== 'function') {
    throw new Error('Local storage is unavailable. Enable browser storage to save face profiles.');
  }
}

export function readProfiles(storage = globalThis.localStorage) {
  requireStorage(storage, 'getItem');
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (error) {
    throw new Error(`Unable to read face profiles: ${error.message}`, { cause: error });
  }
  if (raw === null) return [];
  try {
    const stored = JSON.parse(raw);
    if (!stored || stored.version !== SCHEMA_VERSION || !Array.isArray(stored.profiles)) {
      throw new TypeError('Unsupported or invalid face profile data format.');
    }
    return validateProfiles(stored.profiles);
  } catch (error) {
    throw new Error(`Stored face profiles are invalid. Existing data has been preserved. ${error.message}`, { cause: error });
  }
}

export function writeProfiles(profiles, storage = globalThis.localStorage) {
  const valid = validateProfiles(profiles);
  requireStorage(storage, 'setItem');
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, profiles: valid }));
  } catch (error) {
    throw new Error(`Unable to save face profiles: ${error.message}`, { cause: error });
  }
}

export function removeProfiles(storage = globalThis.localStorage) {
  requireStorage(storage, 'removeItem');
  try {
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    throw new Error(`Unable to remove face profiles: ${error.message}`, { cause: error });
  }
}

function distanceBetween(a, b) {
  // Math.hypot avoids intermediate overflow for valid but unusually large values.
  return Math.hypot(...a.map((value, index) => value - b[index]));
}

function meanDistance(descriptor, samples) {
  let mean = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const distance = distanceBetween(descriptor, samples[index]);
    if (!Number.isFinite(distance)) return Infinity;
    // An incremental mean preserves equal sample distances at exact thresholds.
    mean += (distance - mean) / (index + 1);
  }
  return mean;
}

/**
 * Face-api descriptors: lower distance = closer match.
 * Default 0.42 is stricter than 0.5 to reduce “คน A ถูกอ่านเป็นคน B”.
 * Also requires a clear gap vs the 2nd-best profile.
 */
export function matchDescriptor(descriptor, profiles, threshold = 0.42, { minMargin = 0.06 } = {}) {
  const candidate = validateDescriptor(descriptor);
  const valid = validateProfiles(profiles);
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0) {
    throw new TypeError('The recognition threshold must be a finite nonnegative number.');
  }
  let nearest = null;
  let distance = Infinity;
  let second = Infinity;
  for (const profile of valid) {
    const nextDistance = meanDistance(candidate, profile.descriptors);
    if (nextDistance < distance) {
      second = distance;
      nearest = profile;
      distance = nextDistance;
    } else if (nextDistance < second) {
      second = nextDistance;
    }
  }
  const clearWinner = !Number.isFinite(second) || second - distance >= minMargin || valid.length < 2;
  const matched = nearest !== null && distance <= threshold && clearWinner;
  return {
    id: matched ? nearest.id : null,
    name: matched ? nearest.name : 'Unknown',
    distance,
    secondDistance: Number.isFinite(second) ? second : null,
    matched,
  };
}

/** Reasons are stable UI codes; the calling UI owns localized explanations. */
export function evaluateEnrollmentSample(descriptor, existingSamples = [], profiles = []) {
  let candidate;
  try {
    candidate = validateDescriptor(descriptor);
  } catch {
    return { ok: false, reason: 'invalid_descriptor' };
  }
  let samples;
  try {
    if (!Array.isArray(existingSamples)) throw new TypeError('Samples must be an array.');
    samples = existingSamples.map(validateDescriptor);
  } catch {
    return { ok: false, reason: 'invalid_samples' };
  }
  if (samples.length && meanDistance(candidate, samples) > 0.55) {
    return { ok: false, reason: 'person_changed' };
  }
  const existingMatch = matchDescriptor(candidate, profiles, 0.45);
  if (existingMatch.distance < 0.45) {
    return { ok: false, reason: 'already_enrolled' };
  }
  return { ok: true, reason: null };
}
