const STORAGE_KEY = 'face-reg.guard.v1';

export const DEFAULT_GUARD_CONFIG = {
  /** When true, unknown faces trigger VPS alerts (door / RTSP mode). */
  watchMode: true,
  /**
   * Video source for watch mode:
   * - rtsp: MediaMTX WHEP (RTSP camera on Ubuntu/local server) — default
   * - browser: laptop/phone webcam (demo / enroll only)
   */
  videoSource: 'rtsp',
  /** Home-guard base URL on the VPS */
  guardUrl: 'https://guard.effecttier.com',
  /** PI_TOKEN from VPS /root/home-guard/.env */
  piToken: '',
  /** Min seconds between stranger alerts */
  alertCooldownSec: 45,
  /** MediaMTX path name (publisher or RTSP pull) */
  streamPath: 'cam1',
  /**
   * Full WHEP URL. Empty = same-origin `/webrtc/{streamPath}/whep`
   * (face server proxies to local MediaMTX).
   * Example: http://127.0.0.1:8889/cam1/whep
   * Or: https://guard.effecttier.com/webrtc/cam1/whep
   */
  whepUrl: '',
};

export function loadGuardConfig() {
  if (typeof window === 'undefined') return { ...DEFAULT_GUARD_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GUARD_CONFIG };
    const parsed = JSON.parse(raw);
    const videoSource = parsed.videoSource === 'browser' ? 'browser' : 'rtsp';
    return {
      ...DEFAULT_GUARD_CONFIG,
      ...parsed,
      watchMode: parsed.watchMode !== false,
      videoSource,
      alertCooldownSec: Math.max(10, Number(parsed.alertCooldownSec) || 45),
      guardUrl: String(parsed.guardUrl || DEFAULT_GUARD_CONFIG.guardUrl).replace(/\/$/, ''),
      piToken: String(parsed.piToken || ''),
      streamPath: String(parsed.streamPath || 'cam1').slice(0, 40),
      whepUrl: String(parsed.whepUrl || '').trim(),
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
    whepUrl: String(config.whepUrl || '').trim(),
    watchMode: Boolean(config.watchMode),
    videoSource: config.videoSource === 'browser' ? 'browser' : 'rtsp',
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
