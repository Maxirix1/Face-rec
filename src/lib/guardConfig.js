const STORAGE_KEY = 'face-reg.guard.v1';

export const DEFAULT_GUARD_CONFIG = {
  /** When true, unknown faces trigger VPS alerts (Pi / door mode). */
  watchMode: true,
  /** Home-guard base URL on the VPS */
  guardUrl: 'https://guard.effecttier.com',
  /** PI_TOKEN from VPS /root/home-guard/.env */
  piToken: '',
  /** Min seconds between stranger alerts */
  alertCooldownSec: 45,
  /** Optional stream path name on MediaMTX */
  streamPath: 'cam1',
};

export function loadGuardConfig() {
  if (typeof window === 'undefined') return { ...DEFAULT_GUARD_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GUARD_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_GUARD_CONFIG,
      ...parsed,
      watchMode: parsed.watchMode !== false,
      alertCooldownSec: Math.max(10, Number(parsed.alertCooldownSec) || 45),
      guardUrl: String(parsed.guardUrl || DEFAULT_GUARD_CONFIG.guardUrl).replace(/\/$/, ''),
      piToken: String(parsed.piToken || ''),
      streamPath: String(parsed.streamPath || 'cam1').slice(0, 40),
    };
  } catch {
    return { ...DEFAULT_GUARD_CONFIG };
  }
}

export function saveGuardConfig(config) {
  const next = {
    ...DEFAULT_GUARD_CONFIG,
    ...config,
    guardUrl: String(config.guardUrl || DEFAULT_GUARD_CONFIG.guardUrl).replace(/\/$/, ''),
    piToken: String(config.piToken || ''),
    alertCooldownSec: Math.max(10, Number(config.alertCooldownSec) || 45),
    streamPath: String(config.streamPath || 'cam1').slice(0, 40),
    watchMode: Boolean(config.watchMode),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
