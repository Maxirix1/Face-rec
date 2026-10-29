/**
 * Play a MediaMTX (or compatible) WHEP WebRTC stream into a MediaStream.
 * Browsers cannot open RTSP directly — Ubuntu/local server publishes RTSP to
 * MediaMTX, then this client pulls via WHEP for <video> + face-api.
 */

export function resolveWhepUrl({ whepUrl, streamPath = 'cam1', guardUrl } = {}) {
  const custom = String(whepUrl || '').trim();
  if (custom) return custom.replace(/\/$/, '');
  const path = String(streamPath || 'cam1').replace(/^\/+|\/+$/g, '') || 'cam1';
  // Same-origin proxy on the face server (see scripts/server.js)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/webrtc/${path}/whep`;
  }
  if (guardUrl) {
    return `${String(guardUrl).replace(/\/$/, '')}/webrtc/${path}/whep`;
  }
  return `/webrtc/${path}/whep`;
}

/**
 * @returns {Promise<{ stream: MediaStream, close: () => void }>}
 */
export async function openWhepStream(whepUrl, { timeoutMs = 12000 } = {}) {
  if (!whepUrl) throw new Error('missing_whep_url');
  if (typeof RTCPeerConnection === 'undefined') {
    throw new Error('webrtc_unsupported');
  }

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  });

  let settled = false;
  let remoteStream = null;
  const trackWait = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('whep_timeout'));
      }
    }, timeoutMs);

    pc.ontrack = (event) => {
      if (settled) return;
      remoteStream = event.streams?.[0] || new MediaStream([event.track]);
      if (event.track && !remoteStream.getTracks().includes(event.track)) {
        remoteStream.addTrack(event.track);
      }
      // Prefer waiting until we have video
      if (remoteStream.getVideoTracks().length) {
        settled = true;
        clearTimeout(timer);
        resolve(remoteStream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState) && !settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`whep_${pc.connectionState}`));
      }
    };
  });

  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Wait briefly for ICE gather (helps some MediaMTX setups)
  await waitIceGathering(pc, 2000);

  const res = await fetch(whepUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: pc.localDescription?.sdp || offer.sdp,
  });

  if (!res.ok) {
    pc.close();
    throw new Error(`whep_http_${res.status}`);
  }

  const answer = await res.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });

  const stream = await trackWait;

  return {
    stream,
    close: () => {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        /* ignore */
      }
      try {
        pc.close();
      } catch {
        /* ignore */
      }
    },
  };
}

function waitIceGathering(pc, maxMs) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') done();
    };
    const timer = setTimeout(done, maxMs);
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}
