/** Send stranger / known alerts to the VPS home-guard service. */

export async function pullFamilyProfiles({ guardUrl, piToken }) {
  if (!guardUrl || !piToken) throw new Error('missing_guard_config');
  const res = await fetch(`${guardUrl.replace(/\/$/, '')}/api/family`, {
    headers: { Authorization: `Bearer ${piToken}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `guard_http_${res.status}`);
  return Array.isArray(data.profiles) ? data.profiles : [];
}

export async function pushFamilyProfiles({ guardUrl, piToken, profiles }) {
  if (!guardUrl || !piToken) throw new Error('missing_guard_config');
  const res = await fetch(`${guardUrl.replace(/\/$/, '')}/api/family`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${piToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profiles }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `guard_http_${res.status}`);
  return data;
}

export async function postGuardAlert({
  guardUrl,
  piToken,
  type = 'unknown',
  label,
  message,
  streamPath = 'cam1',
  snapshotBase64,
}) {
  if (!guardUrl || !piToken) {
    throw new Error('missing_guard_config');
  }

  const body = {
    type: type === 'known' ? 'known' : 'unknown',
    label: String(label || (type === 'known' ? 'คนในบ้าน' : 'คนแปลกหน้า')).slice(0, 80),
    message: String(message || '').slice(0, 240),
    streamPath: String(streamPath || 'cam1').slice(0, 40),
  };
  if (snapshotBase64) body.snapshotBase64 = snapshotBase64;

  const res = await fetch(`${guardUrl.replace(/\/$/, '')}/api/alerts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${piToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `guard_http_${res.status}`);
  }
  return data;
}

/** Grab a JPEG data-URL from the recognition canvas (or video frame). */
export function captureSnapshotDataUrl(canvas, video, { maxWidth = 640, quality = 0.72 } = {}) {
  try {
    const source = canvas?.width ? canvas : null;
    if (source) {
      const scale = Math.min(1, maxWidth / source.width);
      const w = Math.max(1, Math.round(source.width * scale));
      const h = Math.max(1, Math.round(source.height * scale));
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const ctx = off.getContext('2d');
      ctx.drawImage(source, 0, 0, w, h);
      return off.toDataURL('image/jpeg', quality);
    }
    if (video?.videoWidth) {
      const scale = Math.min(1, maxWidth / video.videoWidth);
      const w = Math.max(1, Math.round(video.videoWidth * scale));
      const h = Math.max(1, Math.round(video.videoHeight * scale));
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const ctx = off.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);
      return off.toDataURL('image/jpeg', quality);
    }
  } catch {
    /* ignore */
  }
  return null;
}
