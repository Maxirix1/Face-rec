import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SAMPLES_PER_PERSON,
  STORAGE_KEY,
  normalizeName,
  createProfile,
  samplesFromDescriptors,
  readProfiles,
  writeProfiles,
  removeProfiles,
  matchDescriptor,
  evaluateEnrollmentSample,
} from '../lib/profiles.js';
import { loadGuardConfig, saveGuardConfig } from '../lib/guardConfig.js';
import {
  captureSnapshotDataUrl,
  postGuardAlert,
  pullFamilyProfiles,
  pushFamilyProfiles,
} from '../lib/guardClient.js';
import { openWhepStream, resolveWhepUrl } from '../lib/whepClient.js';

const CAMERA_ERRORS = {
  NotAllowedError: 'ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาเปิดสิทธิ์กล้องของเว็บไซต์ในเบราว์เซอร์ แล้วลองใหม่',
  NotFoundError: 'ไม่พบกล้อง กรุณาเชื่อมต่อเว็บแคม แล้วลองใหม่',
  NotReadableError: 'เปิดกล้องไม่ได้ กล้องอาจถูกใช้โดยโปรแกรมอื่น กรุณาปิดโปรแกรมนั้น แล้วลองใหม่',
  OverconstrainedError: 'กล้องไม่รองรับการตั้งค่านี้ กรุณาลองใช้กล้องหรือเบราว์เซอร์อื่น',
  SecurityError: 'เบราว์เซอร์ปิดกั้นกล้อง กรุณาเปิดเว็บผ่าน localhost หรือ HTTPS',
};

export function useFaceRegistry() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const faceapiRef = useRef(null);
  const streamRef = useRef(null);
  const loopTimerRef = useRef(null);
  const cameraGenerationRef = useRef(0);
  const modelsPromiseRef = useRef(null);
  const latestFacesRef = useRef([]);
  const latestAtRef = useRef(0);
  const samplesRef = useRef([]);
  const lastSampleAtRef = useRef(0);
  const lastCapturedDetectionAtRef = useRef(0);
  const profilesRef = useRef([]);
  const thresholdRef = useRef(0.42);
  const mirrorOverlayRef = useRef(true);
  const uploadUrlRef = useRef(null);
  const stopCameraRef = useRef(() => {});
  const clearUploadRef = useRef(() => {});

  const [profiles, setProfiles] = useState([]);
  const [samples, setSamples] = useState([]);
  const [storageReady, setStorageReady] = useState(true);
  const [modelsReady, setModelsReady] = useState(false);
  const [engineStatus, setEngineStatus] = useState('กำลังเตรียมโมเดล…');
  const [starting, setStarting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraState, setCameraState] = useState('กล้องปิดอยู่');
  const [sourceMode, setSourceMode] = useState('camera');
  const [uploadName, setUploadName] = useState('');
  const [scanSummary, setScanSummary] = useState('เปิดกล้องเพื่อตรวจหาคนในระบบ');
  const [metricFaces, setMetricFaces] = useState('—');
  const [metricLatency, setMetricLatency] = useState('—');
  const [personName, setPersonName] = useState('');
  const [consent, setConsent] = useState(false);
  const [captureHelp, setCaptureHelp] = useState('ใส่ชื่อ แล้วอัปโหลดรูปใบหน้าของคนนั้น');
  const [threshold, setThreshold] = useState(0.42);
  const [results, setResults] = useState([]);
  const [notice, setNotice] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('3 / 4');
  const [enrolling, setEnrolling] = useState(false);
  const [guardConfig, setGuardConfig] = useState(() => loadGuardConfig());
  const [lastGuardAlertAt, setLastGuardAlertAt] = useState(0);
  const [guardAlertStatus, setGuardAlertStatus] = useState('idle');
  const [strangerLabel, setStrangerLabel] = useState(null);
  const guardConfigRef = useRef(guardConfig);
  const lastGuardAlertAtRef = useRef(0);
  const guardBusyRef = useRef(false);
  const maybeNotifyGuardRef = useRef(null);
  /** Cleanup for WebRTC/WHEP (RTSP path via MediaMTX). */
  const whepCloseRef = useRef(null);
  const videoSourceKindRef = useRef('rtsp');

  guardConfigRef.current = guardConfig;

  const showNotice = useCallback((message, error = false, retry = null) => {
    setNotice({ message, error, retry });
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const drawRecognition = useCallback((faces, activeProfiles, activeThreshold, { active = false, mirror = true } = {}) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (!faces.length) {
      setStrangerLabel(null);
      setResults([{
        muted: true,
        label: active
          ? (activeProfiles.length ? 'ยังไม่พบใบหน้า · มองกล้องให้ชัด' : 'ยังไม่มีคนในระบบ · ไปแท็บเพิ่มคนก่อน')
          : 'เปิดกล้องเพื่อตรวจหาคนในระบบ',
      }]);
      return;
    }

    const nextResults = [];
    for (const face of faces) {
      const match = matchDescriptor(face.descriptor, activeProfiles, activeThreshold);
      const label = match.matched ? match.name : 'คนแปลกหน้า';
      nextResults.push({
        label,
        matched: match.matched,
        distance: Number.isFinite(match.distance) ? match.distance : null,
      });

      const box = face.detection.box;
      const x = mirror ? canvas.width - box.x - box.width : box.x;
      const color = match.matched ? '#22c55e' : '#ef4444';
      const fontSize = Math.max(18, Math.round(canvas.width / 36));
      context.strokeStyle = color;
      context.lineWidth = Math.max(3, canvas.width / 280);
      context.strokeRect(x, box.y, box.width, box.height);
      context.font = `700 ${fontSize}px "LINE Seed Sans TH", "LINE Seed Sans", sans-serif`;
      const text = match.matched
        ? `✓ ${Array.from(label).slice(0, 22).join('')}`
        : `! ${Array.from(label).slice(0, 20).join('')}`;
      const width = Math.min(canvas.width, context.measureText(text).width + 24);
      const labelX = Math.max(0, Math.min(x, canvas.width - width));
      const labelY = Math.max(0, box.y - fontSize - 18);
      context.fillStyle = color;
      context.fillRect(labelX, labelY, width, fontSize + 14);
      context.fillStyle = match.matched ? '#052e16' : '#450a0a';
      context.fillText(text, labelX + 12, labelY + fontSize + 2, width - 24);
    }
    setResults(nextResults);
    const stranger = nextResults.find((item) => !item.matched && !item.muted);
    setStrangerLabel(stranger ? stranger.label : null);
    if (active) maybeNotifyGuardRef.current?.(nextResults);
  }, []);

  const maybeNotifyGuard = useCallback((nextResults) => {
    const cfg = guardConfigRef.current;
    if (!cfg.watchMode || !cfg.guardUrl || !cfg.piToken) return;
    if (!streamRef.current) return; // only live camera (Pi door mode)
    if (!profilesRef.current.length) return;
    const stranger = (nextResults || []).find((item) => item && !item.muted && !item.matched);
    if (!stranger) return;
    if (guardBusyRef.current) return;

    const now = Date.now();
    const cooldownMs = (cfg.alertCooldownSec || 45) * 1000;
    if (now - lastGuardAlertAtRef.current < cooldownMs) return;

    guardBusyRef.current = true;
    lastGuardAlertAtRef.current = now;
    setLastGuardAlertAt(now);
    setGuardAlertStatus('sending');

    const snapshotBase64 = captureSnapshotDataUrl(canvasRef.current, videoRef.current);
    void postGuardAlert({
      guardUrl: cfg.guardUrl,
      piToken: cfg.piToken,
      type: 'unknown',
      label: stranger.label || 'คนแปลกหน้า',
      message: 'ตรวจพบบุคคลที่ไม่ใช่คนในครอบครัวที่กล้องหน้าบ้าน',
      streamPath: cfg.streamPath,
      snapshotBase64,
    })
      .then(() => {
        setGuardAlertStatus('sent');
        showNotice('แจ้งเตือนไปยัง VPS แล้ว · ครอบครัวสามารถเปิดดูกล้องได้');
      })
      .catch((error) => {
        setGuardAlertStatus('error');
        console.error(error);
        showNotice('ส่งแจ้งเตือนไป VPS ไม่สำเร็จ ตรวจ URL/Token หรือเน็ตของ Pi', true);
      })
      .finally(() => {
        guardBusyRef.current = false;
      });
  }, [showNotice]);

  maybeNotifyGuardRef.current = maybeNotifyGuard;

  const updateGuardConfig = useCallback((patch) => {
    setGuardConfig((prev) => saveGuardConfig({ ...prev, ...patch }));
  }, []);

  const testGuardAlert = useCallback(async () => {
    const cfg = guardConfigRef.current;
    if (!cfg.guardUrl || !cfg.piToken) {
      showNotice('ใส่ Guard URL และ Pi Token ก่อนทดสอบ', true);
      return;
    }
    setGuardAlertStatus('sending');
    try {
      await postGuardAlert({
        guardUrl: cfg.guardUrl,
        piToken: cfg.piToken,
        type: 'unknown',
        label: 'ทดสอบ',
        message: 'ทดสอบแจ้งเตือนจากแอป Face',
        streamPath: cfg.streamPath,
      });
      setGuardAlertStatus('sent');
      setLastGuardAlertAt(Date.now());
      showNotice('ทดสอบแจ้งเตือนสำเร็จ · เปิด guard.effecttier.com ได้เลย');
    } catch (error) {
      setGuardAlertStatus('error');
      console.error(error);
      showNotice('ทดสอบไม่สำเร็จ ตรวจ URL/Token', true);
    }
  }, [showNotice]);

  const renderRecognition = useCallback(() => {
    const active = !!streamRef.current || !!uploadUrlRef.current;
    drawRecognition(
      latestFacesRef.current,
      profilesRef.current,
      thresholdRef.current,
      { active, mirror: mirrorOverlayRef.current },
    );
  }, [drawRecognition]);

  const syncFamilyToVps = useCallback(async () => {
    const cfg = guardConfigRef.current;
    if (!cfg.guardUrl || !cfg.piToken) {
      showNotice('ใส่ Guard URL และ Pi Token ก่อนซิงก์', true);
      return;
    }
    try {
      await pushFamilyProfiles({
        guardUrl: cfg.guardUrl,
        piToken: cfg.piToken,
        profiles: profilesRef.current,
      });
      showNotice(`ซิงก์ครอบครัวขึ้น VPS แล้ว (${profilesRef.current.length} คน)`);
    } catch (error) {
      console.error(error);
      showNotice('ซิงก์ขึ้น VPS ไม่สำเร็จ', true);
    }
  }, [showNotice]);

  const syncFamilyFromVps = useCallback(async () => {
    const cfg = guardConfigRef.current;
    if (!cfg.guardUrl || !cfg.piToken) {
      showNotice('ใส่ Guard URL และ Pi Token ก่อนดึงรายชื่อ', true);
      return;
    }
    try {
      const remote = await pullFamilyProfiles({
        guardUrl: cfg.guardUrl,
        piToken: cfg.piToken,
      });
      writeProfiles(remote);
      profilesRef.current = remote;
      setProfiles(remote);
      renderRecognition();
      showNotice(`ดึงครอบครัวจาก VPS แล้ว (${remote.length} คน)`);
    } catch (error) {
      console.error(error);
      showNotice('ดึงรายชื่อจาก VPS ไม่สำเร็จ', true);
    }
  }, [showNotice, renderRecognition]);

  const loadProfiles = useCallback(() => {
    try {
      const next = readProfiles();
      profilesRef.current = next;
      setProfiles(next);
      setStorageReady(true);
    } catch (error) {
      profilesRef.current = [];
      setProfiles([]);
      setStorageReady(false);
      showNotice('อ่านข้อมูลใบหน้าที่บันทึกไว้ไม่ได้ ข้อมูลเดิมยังอยู่ กรุณาอนุญาตพื้นที่จัดเก็บของเบราว์เซอร์ หรือกด “ลบทั้งหมด” เพื่อเริ่มใหม่', true);
      console.error(error);
    }
  }, [showNotice]);

  const ensureModels = useCallback(async () => {
    if (faceapiRef.current && modelsReady) return;
    if (modelsPromiseRef.current) return modelsPromiseRef.current;

    setEngineStatus('กำลังโหลดโมเดลจากเครื่อง…');
    modelsPromiseRef.current = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      faceapiRef.current = faceapi;
      try {
        const available = await faceapi.tf.setBackend('webgl');
        if (!available) throw new Error('WebGL unavailable');
        await faceapi.tf.ready();
      } catch {
        await faceapi.tf.setBackend('cpu');
        await faceapi.tf.ready();
      }
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
      setModelsReady(true);
      setEngineStatus(`โมเดลพร้อม · ${faceapi.tf.getBackend() === 'webgl' ? 'WebGL' : 'CPU'} · ทำงานในเบราว์เซอร์`);
    })().catch((error) => {
      modelsPromiseRef.current = null;
      setEngineStatus('โหลดโมเดลไม่สำเร็จ');
      showNotice(
        'โหลดโมเดลไม่สำเร็จ ตรวจสอบว่าได้รัน npm install และเปิดเว็บผ่าน npm start แล้ว',
        true,
        () => ensureModels().catch(() => {}),
      );
      throw error;
    });
    return modelsPromiseRef.current;
  }, [modelsReady, showNotice]);

  const detectionLoop = useCallback(async (generation) => {
    if (generation !== cameraGenerationRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const faceapi = faceapiRef.current;
    if (!video || !faceapi) return;

    if (document.hidden || video.readyState < 2) {
      latestAtRef.current = 0;
      loopTimerRef.current = setTimeout(() => detectionLoop(generation), 250);
      return;
    }

    const began = performance.now();
    try {
      const faces = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.6 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (generation !== cameraGenerationRef.current) return;
      if (document.hidden) {
        loopTimerRef.current = setTimeout(() => detectionLoop(generation), 250);
        return;
      }

      latestFacesRef.current = faces;
      latestAtRef.current = performance.now();
      setMetricFaces(String(faces.length).padStart(2, '0'));
      setMetricLatency(`${Math.round(latestAtRef.current - began)}`);
      setScanSummary(
        faces.length
          ? `พบ ${faces.length} ใบหน้า${profilesRef.current.length ? ' · กำลังเปรียบเทียบกับข้อมูลที่บันทึก' : ' · เริ่มลงทะเบียนได้เลย'}`
          : 'ไม่พบใบหน้า · ลองมองกล้องและเพิ่มแสงสว่าง',
      );
      const mirror = videoSourceKindRef.current === 'browser';
      mirrorOverlayRef.current = mirror;
      drawRecognition(faces, profilesRef.current, thresholdRef.current, { active: true, mirror });
    } catch (error) {
      if (generation !== cameraGenerationRef.current) return;
      stopCameraRef.current();
      showNotice('ประมวลผลใบหน้าไม่สำเร็จ กรุณาลองเปิดกล้องใหม่ หรือตรวจสอบว่าเบราว์เซอร์รองรับ WebGL', true);
      console.error(error);
      return;
    }

    if (generation === cameraGenerationRef.current) {
      loopTimerRef.current = setTimeout(
        () => detectionLoop(generation),
        Math.max(80, 220 - (performance.now() - began)),
      );
    }
  }, [drawRecognition, showNotice]);

  const stopCamera = useCallback(() => {
    cameraGenerationRef.current += 1;
    clearTimeout(loopTimerRef.current);
    try {
      whepCloseRef.current?.();
    } catch {
      /* ignore */
    }
    whepCloseRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStarting(false);
    setCameraOn(false);
    if (videoRef.current) videoRef.current.srcObject = null;
    if (!uploadUrlRef.current) {
      latestFacesRef.current = [];
      latestAtRef.current = 0;
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      setMetricFaces('—');
      setMetricLatency('—');
      setScanSummary('เลือกโหมดกล้องหรืออัปโหลดรูปเพื่อเริ่มทดสอบ');
      drawRecognition([], profilesRef.current, thresholdRef.current, { active: false, mirror: true });
    }
    setCameraState('กล้องปิดอยู่');
  }, [drawRecognition]);

  stopCameraRef.current = stopCamera;

  const clearUpload = useCallback(() => {
    if (uploadUrlRef.current) {
      URL.revokeObjectURL(uploadUrlRef.current);
      uploadUrlRef.current = null;
    }
    if (imageRef.current) {
      imageRef.current.removeAttribute('src');
      imageRef.current.alt = '';
    }
    setUploadName('');
    if (!streamRef.current) {
      latestFacesRef.current = [];
      latestAtRef.current = 0;
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      setMetricFaces('—');
      setMetricLatency('—');
      setAspectRatio('4 / 3');
      setScanSummary('เลือกโหมดกล้องหรืออัปโหลดรูปเพื่อเริ่มทดสอบ');
      drawRecognition([], profilesRef.current, thresholdRef.current, { active: false, mirror: false });
    }
  }, [drawRecognition]);

  clearUploadRef.current = clearUpload;

  const attachLiveStream = useCallback(async (requestedStream, generation, { mirror, label }) => {
    streamRef.current = requestedStream;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    video.srcObject = requestedStream;
    await video.play();
    if (generation !== cameraGenerationRef.current) return;

    // WebRTC may report 0x0 briefly — wait for real frames
    if (!video.videoWidth || !video.videoHeight) {
      await new Promise((resolve) => {
        const done = () => {
          video.removeEventListener('loadedmetadata', done);
          resolve();
        };
        video.addEventListener('loadedmetadata', done);
        setTimeout(done, 2500);
      });
    }
    if (generation !== cameraGenerationRef.current) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    setAspectRatio(`${w} / ${h}`);
    mirrorOverlayRef.current = mirror;
    setCameraOn(true);
    setCameraState(label);
    setScanSummary('กำลังค้นหาใบหน้า…');
    if (storageReady) clearNotice();

    for (const track of requestedStream.getVideoTracks()) {
      track.addEventListener('ended', () => {
        if (generation !== cameraGenerationRef.current) return;
        stopCamera();
        showNotice('สตรีมกล้องขาด กรุณาตรวจ RTSP/MediaMTX แล้วเปิดใหม่', true);
      }, { once: true });
    }

    void detectionLoop(generation);
  }, [storageReady, clearNotice, detectionLoop, stopCamera, showNotice]);

  const startCamera = useCallback(async () => {
    if (starting || streamRef.current) return;

    const cfg = guardConfigRef.current;
    const useRtsp = cfg.videoSource !== 'browser';

    clearUpload();
    setSourceMode('camera');
    const generation = ++cameraGenerationRef.current;
    setStarting(true);
    try {
      await ensureModels();
      if (generation !== cameraGenerationRef.current) return;

      if (useRtsp) {
        videoSourceKindRef.current = 'rtsp';
        setCameraState('กำลังเชื่อม RTSP / WebRTC…');
        const whepUrl = resolveWhepUrl(cfg);
        const session = await openWhepStream(whepUrl);
        if (generation !== cameraGenerationRef.current) {
          session.close();
          return;
        }
        whepCloseRef.current = session.close;
        await attachLiveStream(session.stream, generation, {
          mirror: false,
          label: 'กล้อง RTSP (MediaMTX)',
        });
        return;
      }

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        showNotice('การใช้กล้องเบราว์เซอร์ต้องเปิดผ่าน localhost หรือ HTTPS — หรือสลับเป็นแหล่ง RTSP ในตั้งค่า', true);
        return;
      }

      videoSourceKindRef.current = 'browser';
      const requestedStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });

      if (generation !== cameraGenerationRef.current) {
        requestedStream.getTracks().forEach((track) => track.stop());
        return;
      }

      await attachLiveStream(requestedStream, generation, {
        mirror: true,
        label: 'กล้องเบราว์เซอร์',
      });
    } catch (error) {
      if (generation !== cameraGenerationRef.current) return;
      stopCamera();
      if (modelsReady || faceapiRef.current) {
        const msg = useRtsp
          ? 'เปิดสตรีม RTSP ไม่สำเร็จ · ตรวจว่า Ubuntu ดันกล้องเข้า MediaMTX แล้ว และ WHEP URL ถูกต้อง'
          : (CAMERA_ERRORS[error.name] ?? 'เปิดกล้องไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อกล้องและลองใหม่');
        showNotice(msg, true);
      }
      console.error(error);
    } finally {
      if (generation === cameraGenerationRef.current) setStarting(false);
    }
  }, [
    starting,
    clearUpload,
    ensureModels,
    attachLiveStream,
    stopCamera,
    showNotice,
    modelsReady,
  ]);

  const scanImageFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showNotice('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP)', true);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showNotice('ไฟล์ใหญ่เกิน 12MB กรุณาเลือกรูปที่เล็กกว่านี้', true);
      return;
    }

    stopCamera();
    setSourceMode('upload');
    setScanning(true);
    setScanSummary('กำลังโหลดรูปและสแกนใบหน้า…');

    let objectUrl = null;
    try {
      await ensureModels();
      const faceapi = faceapiRef.current;
      objectUrl = URL.createObjectURL(file);
      if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
      uploadUrlRef.current = objectUrl;

      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image_load_failed'));
        img.src = objectUrl;
      });

      if (imageRef.current) {
        imageRef.current.src = objectUrl;
        imageRef.current.alt = `รูปทดสอบ: ${file.name}`;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      setAspectRatio(`${image.naturalWidth} / ${image.naturalHeight}`);
      setUploadName(file.name);
      mirrorOverlayRef.current = false;

      const began = performance.now();
      const faces = await faceapi
        .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      latestFacesRef.current = faces;
      latestAtRef.current = performance.now();
      lastCapturedDetectionAtRef.current = 0;
      setMetricFaces(String(faces.length).padStart(2, '0'));
      setMetricLatency(`${Math.round(latestAtRef.current - began)}`);
      setScanSummary(
        faces.length
          ? `สแกนรูปสำเร็จ · พบ ${faces.length} ใบหน้า${profilesRef.current.length ? ' · เทียบกับโปรไฟล์ในแล็บ' : ' · ยังไม่มีโปรไฟล์ให้เทียบ'}`
          : 'ไม่พบใบหน้าในรูป · ลองเลือกรูปที่ใบหน้าชัดและขนาดใหญ่พอ',
      );
      drawRecognition(faces, profilesRef.current, thresholdRef.current, { active: true, mirror: false });
      if (storageReady) clearNotice();
      if (!faces.length) {
        showNotice('ไม่พบใบหน้าในรูปที่อัปโหลด ลองใช้รูปที่ใบหน้าชัดและหันเข้าหากล้อง', true);
      } else {
        showNotice(`สแกนเสร็จ · พบ ${faces.length} ใบหน้าใน “${file.name}”`);
      }
    } catch (error) {
      if (objectUrl && uploadUrlRef.current === objectUrl) {
        URL.revokeObjectURL(objectUrl);
        uploadUrlRef.current = null;
      }
      setUploadName('');
      setScanSummary('สแกนรูปไม่สำเร็จ');
      showNotice('สแกนรูปไม่สำเร็จ กรุณาลองไฟล์อื่น หรือตรวจสอบว่าโมเดลพร้อมแล้ว', true);
      console.error(error);
    } finally {
      setScanning(false);
    }
  }, [stopCamera, ensureModels, drawRecognition, storageReady, clearNotice, showNotice]);

  const changeSourceMode = useCallback((mode) => {
    if (mode === sourceMode) return;
    if (mode === 'camera') {
      clearUpload();
      setSourceMode('camera');
      setScanSummary(cameraOn ? 'กำลังค้นหาใบหน้า…' : 'เปิดกล้องเพื่อตรวจหาคนในระบบ');
    } else {
      stopCamera();
      setSourceMode('upload');
      setScanSummary('อัปโหลดรูปเพื่อเพิ่มคนในระบบ');
    }
  }, [sourceMode, clearUpload, cameraOn, stopCamera]);

  const resetSamples = useCallback(() => {
    samplesRef.current = [];
    setSamples([]);
    lastSampleAtRef.current = 0;
    lastCapturedDetectionAtRef.current = 0;
    setCaptureHelp('ใส่ชื่อ แล้วอัปโหลดรูปใบหน้าของคนนั้น');
  }, []);

  /** Mobile-first: one photo → save person into the system. */
  const enrollFromPhoto = useCallback(async (file) => {
    if (enrolling) return;
    let name;
    try {
      name = normalizeName(personName);
    } catch {
      showNotice('กรุณาใส่ชื่อก่อนอัปโหลดรูป', true);
      return;
    }
    if (!consent) {
      showNotice('กรุณายินยอมบันทึกลักษณะใบหน้าก่อน', true);
      return;
    }
    if (!file || !file.type.startsWith('image/')) {
      showNotice('กรุณาเลือกรูปภาพ', true);
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showNotice('ไฟล์ใหญ่เกิน 12MB', true);
      return;
    }
    if (!storageReady) {
      showNotice('บันทึกในเบราว์เซอร์ไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บ', true);
      return;
    }

    setEnrolling(true);
    stopCamera();
    setSourceMode('upload');
    try {
      await ensureModels();
      const faceapi = faceapiRef.current;
      const objectUrl = URL.createObjectURL(file);
      try {
        const image = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('image_load_failed'));
          img.src = objectUrl;
        });

        const faces = await faceapi
          .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (!faces.length) {
          showNotice('ไม่พบใบหน้าในรูป ลองใช้รูปที่ใบหน้าชัดและหันเข้าหากล้อง', true);
          return;
        }
        if (faces.length > 1) {
          showNotice('พบหลายใบหน้า กรุณาใช้รูปที่มีคนเดียว', true);
          return;
        }

        const face = faces[0];
        const { box, score } = face.detection;
        if (score < 0.5 || box.width < 70 || box.height < 70) {
          showNotice('ใบหน้ายังไม่ชัดพอ ลองใช้รูปที่ใกล้และสว่างกว่านี้', true);
          return;
        }

        const evaluation = evaluateEnrollmentSample(face.descriptor, [], profilesRef.current);
        if (!evaluation.ok) {
          showNotice(
            evaluation.reason === 'already_enrolled'
              ? 'ใบหน้านี้มีในระบบแล้ว'
              : 'ข้อมูลใบหน้าไม่สมบูรณ์ ลองรูปอื่น',
            true,
          );
          return;
        }

        const existing = readProfiles();
        const person = createProfile(name, samplesFromDescriptors(face.descriptor), existing);
        writeProfiles([...existing, person]);
        profilesRef.current = [...existing, person];
        setProfiles(profilesRef.current);
        setPersonName('');
        setConsent(false);
        resetSamples();
        showNotice(`เพิ่ม “${person.name}” สำเร็จ · ไปแท็บสแกนเพื่อตรวจด้วยกล้อง`);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      const duplicate = String(error?.message || '').includes('already exists');
      showNotice(
        duplicate ? 'ชื่อนี้มีอยู่แล้ว ใช้ชื่ออื่น' : 'เพิ่มคนไม่สำเร็จ ลองใหม่',
        true,
      );
      console.error(error);
    } finally {
      setEnrolling(false);
    }
  }, [
    enrolling,
    personName,
    consent,
    storageReady,
    stopCamera,
    ensureModels,
    resetSamples,
    showNotice,
  ]);

  const captureSample = useCallback(() => {
    try {
      normalizeName(personName);
    } catch {
      showNotice('กรุณากรอกชื่อก่อนเก็บตัวอย่างใบหน้า (ไม่เกิน 60 ตัวอักษร)', true);
      return;
    }
    if (!consent) {
      showNotice('กรุณาอ่านและเลือกยินยอมให้บันทึกข้อมูลลักษณะใบหน้าก่อนเริ่ม', true);
      return;
    }

    const hasSource = !!streamRef.current || !!uploadUrlRef.current;
    if (!hasSource || !storageReady || samplesRef.current.length >= SAMPLES_PER_PERSON) return;

    const canvas = canvasRef.current;
    const fromUpload = !!uploadUrlRef.current && !streamRef.current;
    if (
      !fromUpload
      && (!latestAtRef.current
        || latestAtRef.current === lastCapturedDetectionAtRef.current
        || performance.now() - latestAtRef.current > 1200)
    ) {
      showNotice('กำลังรอภาพล่าสุดจากกล้อง กรุณารอสักครู่แล้วกดอีกครั้ง', true);
      return;
    }
    if (fromUpload && (!latestAtRef.current || latestFacesRef.current.length === 0)) {
      showNotice('ยังไม่มีผลการสแกนจากรูป กรุณาอัปโหลดรูปใหม่', true);
      return;
    }
    if (latestFacesRef.current.length !== 1) {
      showNotice(
        latestFacesRef.current.length
          ? 'พบหลายใบหน้า กรุณาให้มีคนเดียวในภาพขณะลงทะเบียน'
          : 'ยังไม่พบใบหน้า กรุณามองกล้องหรืออัปโหลดรูปที่ใบหน้าชัด',
        true,
      );
      return;
    }

    const face = latestFacesRef.current[0];
    const { box, score } = face.detection;
    const minSize = fromUpload ? 80 : 100;
    if (
      score < 0.55
      || box.width < minSize
      || box.height < minSize
      || box.x < 2
      || box.y < 2
      || box.x + box.width > canvas.width - 2
      || box.y + box.height > canvas.height - 2
    ) {
      showNotice('ใบหน้ายังไม่ชัดพอ กรุณาใช้รูปที่ใบหน้าใหญ่ชัด หรือขยับใกล้กล้อง', true);
      return;
    }
    if (!fromUpload && lastSampleAtRef.current && performance.now() - lastSampleAtRef.current < 900) {
      showNotice('ลองเปลี่ยนมุมใบหน้าเล็กน้อย แล้วรอหนึ่งวินาทีก่อนเก็บตัวอย่างถัดไป');
      return;
    }

    const evaluation = evaluateEnrollmentSample(face.descriptor, samplesRef.current, profilesRef.current);
    if (!evaluation.ok) {
      const messages = {
        already_enrolled: 'ใบหน้านี้ใกล้เคียงกับคนที่ลงทะเบียนแล้ว หากต้องการลงทะเบียนใหม่ ให้ลบข้อมูลเดิมก่อน',
        person_changed: 'ตัวอย่างนี้ต่างจากก่อนหน้ามาก กรุณาใช้ใบหน้าคนเดิมและหันเพียงเล็กน้อย หรือกดเริ่มใหม่',
      };
      showNotice(messages[evaluation.reason] ?? 'ข้อมูลใบหน้าไม่สมบูรณ์ กรุณาลองเก็บตัวอย่างใหม่', true);
      return;
    }

    const next = [...samplesRef.current, Array.from(face.descriptor)];
    samplesRef.current = next;
    setSamples(next);
    lastSampleAtRef.current = performance.now();
    lastCapturedDetectionAtRef.current = latestAtRef.current;
    setCaptureHelp(
      next.length === SAMPLES_PER_PERSON
        ? 'ครบ 3 ตัวอย่างแล้ว กดบันทึกใบหน้าเพื่อเพิ่มในรายชื่อ'
        : fromUpload
          ? 'เก็บจากรูปแล้ว · อัปโหลดมุมอื่นของคนเดิมเพื่อตัวอย่างถัดไป หรือใช้กล้อง'
          : 'เก็บตัวอย่างแล้ว ลองเปลี่ยนมุมเล็กน้อยโดยยังมองเห็นใบหน้าชัด',
    );
    clearNotice();
  }, [personName, consent, storageReady, showNotice, clearNotice]);

  const saveProfile = useCallback((event) => {
    event.preventDefault();
    if (!consent || samplesRef.current.length !== SAMPLES_PER_PERSON || !storageReady) return;
    try {
      const existing = readProfiles();
      if (samplesRef.current.some((sample) => !evaluateEnrollmentSample(sample, [], existing).ok)) {
        showNotice('ใบหน้านี้ถูกลงทะเบียนไว้แล้ว กรุณาตรวจสอบรายชื่อ', true);
        return;
      }
      const person = createProfile(personName, samplesRef.current, existing);
      writeProfiles([...existing, person]);
      profilesRef.current = [...existing, person];
      setProfiles(profilesRef.current);
      setPersonName('');
      setConsent(false);
      resetSamples();
      renderRecognition();
    showNotice(`ลงทะเบียน ${person.name} สำเร็จ · ทดสอบด้วยกล้องหรืออัปโหลดรูปได้เลย`);
  } catch (error) {
    const duplicate = error.message.includes('already exists');
    showNotice(
      duplicate
        ? 'ชื่อนี้ถูกลงทะเบียนแล้ว กรุณากดเริ่มใหม่แล้วใช้ชื่ออื่น'
        : 'บันทึกไม่สำเร็จ กรุณาตรวจสอบชื่อและพื้นที่จัดเก็บของเบราว์เซอร์ ตัวอย่างที่เก็บไว้ยังอยู่',
      true,
    );
    console.error(error);
  }
}, [consent, storageReady, personName, resetSamples, renderRecognition, showNotice]);

  const deleteProfile = useCallback((id) => {
    const person = profilesRef.current.find((entry) => entry.id === id);
    if (!person || !window.confirm(`ลบข้อมูลใบหน้าของ “${person.name}” จากเบราว์เซอร์นี้?`)) return;
    try {
      const next = readProfiles().filter((entry) => entry.id !== id);
      writeProfiles(next);
      profilesRef.current = next;
      setProfiles(next);
      renderRecognition();
      showNotice(`ลบข้อมูลของ ${person.name} แล้ว`);
    } catch (error) {
      showNotice('ลบข้อมูลไม่สำเร็จ กรุณาตรวจสอบพื้นที่จัดเก็บของเบราว์เซอร์ แล้วลองใหม่', true);
      console.error(error);
    }
  }, [renderRecognition, showNotice]);

  const clearAllProfiles = useCallback(() => {
    if (!window.confirm('ลบข้อมูลใบหน้าทั้งหมดในเบราว์เซอร์นี้? หลังลบจะต้องลงทะเบียนใหม่')) return;
    try {
      removeProfiles();
      profilesRef.current = [];
      setProfiles([]);
      setStorageReady(true);
      resetSamples();
      renderRecognition();
      showNotice('ลบข้อมูลใบหน้าทั้งหมดแล้ว');
    } catch (error) {
      showNotice('ลบข้อมูลไม่ได้ กรุณาตรวจสอบการอนุญาตพื้นที่จัดเก็บของเบราว์เซอร์', true);
      console.error(error);
    }
  }, [resetSamples, renderRecognition, showNotice]);

  const updateThreshold = useCallback((value) => {
    const next = Number(value);
    thresholdRef.current = next;
    setThreshold(next);
    renderRecognition();
  }, [renderRecognition]);

  const handleConsentChange = useCallback((checked) => {
    setConsent(checked);
    if (!checked) resetSamples();
  }, [resetSamples]);

  useEffect(() => {
    loadProfiles();
    void ensureModels().catch((error) => console.error(error));
  }, [loadProfiles, ensureModels]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      resetSamples();
      loadProfiles();
      renderRecognition();
    };
    const onPageHide = () => {
      stopCamera();
      clearUploadRef.current();
      resetSamples();
    };
    const onVisibility = () => {
      if (document.hidden && streamRef.current) {
        latestAtRef.current = 0;
        latestFacesRef.current = [];
        renderRecognition();
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
      stopCamera();
      clearUploadRef.current();
    };
  }, [loadProfiles, resetSamples, renderRecognition, stopCamera]);

  const matchedName = results.find((item) => item.matched)?.label || null;

  return {
    videoRef,
    canvasRef,
    imageRef,
    profiles,
    samples,
    storageReady,
    modelsReady,
    engineStatus,
    starting,
    scanning,
    enrolling,
    cameraOn,
    cameraState,
    sourceMode,
    uploadName,
    scanSummary,
    metricFaces,
    metricLatency,
    personName,
    setPersonName,
    consent,
    handleConsentChange,
    captureHelp,
    threshold,
    updateThreshold,
    results,
    matchedName,
    strangerLabel,
    guardConfig,
    updateGuardConfig,
    testGuardAlert,
    syncFamilyToVps,
    syncFamilyFromVps,
    guardAlertStatus,
    lastGuardAlertAt,
    notice,
    clearNotice,
    aspectRatio,
    startCamera,
    stopCamera,
    scanImageFile,
    enrollFromPhoto,
    clearUpload,
    changeSourceMode,
    captureSample,
    resetSamples,
    saveProfile,
    deleteProfile,
    clearAllProfiles,
    samplesPerPerson: SAMPLES_PER_PERSON,
    canCaptureSource: cameraOn || !!uploadName,
  };
}
