import { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Video, VideoOff, Users, Scan, Timer, Aperture,
  Upload, ImagePlus, Trash2, FlaskConical, Activity,
} from 'lucide-react';

export default function LabStage({
  videoRef,
  canvasRef,
  imageRef,
  sourceMode,
  cameraOn,
  cameraState,
  starting,
  scanning,
  scanSummary,
  engineStatus,
  metricPeople,
  metricFaces,
  metricLatency,
  aspectRatio,
  uploadName,
  modelsReady,
  onStart,
  onStop,
  onUpload,
  onClearUpload,
  onModeChange,
}) {
  const fileRef = useRef(null);
  const showVideo = sourceMode === 'camera' && cameraOn;
  const showImage = sourceMode === 'upload';
  const empty = !showVideo && !showImage;

  return (
    <motion.section
      className="lab-stage-card"
      aria-labelledby="lab-heading"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="lab-rail">
        <div className="lab-rail-left">
          <FlaskConical size={14} aria-hidden="true" />
          <span className="section-kicker">SCAN BENCH · CH-01</span>
        </div>
        <span className={`pill ${cameraOn || sourceMode === 'upload' ? 'active' : ''}`}>
          <Activity size={12} aria-hidden="true" />
          {sourceMode === 'upload' ? 'IMAGE SCAN' : cameraState}
        </span>
      </div>

      <div className="card-header dark">
        <div>
          <h2 id="lab-heading">โต๊ะทดสอบการจดจำ</h2>
          <p className="lab-sub">เปิดกล้องแบบสด หรืออัปโหลดรูปใบหน้าเพื่อสแกน</p>
        </div>
      </div>

      <div className="lab-tabs" role="tablist" aria-label="โหมดสแกน">
        <button
          type="button"
          role="tab"
          aria-selected={sourceMode !== 'upload'}
          className={`lab-tab ${sourceMode !== 'upload' ? 'active' : ''}`}
          onClick={() => onModeChange('camera')}
        >
          <Aperture size={15} aria-hidden="true" />
          Live Camera
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sourceMode === 'upload'}
          className={`lab-tab ${sourceMode === 'upload' ? 'active' : ''}`}
          onClick={() => onModeChange('upload')}
        >
          <Upload size={15} aria-hidden="true" />
          Upload Scan
        </button>
      </div>

      <div
        className={`camera-stage ${sourceMode === 'upload' ? 'mode-upload' : 'mode-camera'}`}
        style={{ aspectRatio }}
      >
        <video
          ref={videoRef}
          className={showVideo ? 'is-visible' : 'is-hidden'}
          autoPlay
          muted
          playsInline
          aria-label="ภาพจากกล้อง"
        />
        <img
          ref={imageRef}
          className={showImage ? 'is-visible' : 'is-hidden'}
          alt={uploadName ? `รูปทดสอบ: ${uploadName}` : ''}
        />
        <canvas ref={canvasRef} aria-hidden="true" />

        {empty && (
          <div className="camera-empty">
            <div className="face-guide" aria-hidden="true">
              <Scan size={36} strokeWidth={1.4} />
            </div>
            <h3>Lab idle</h3>
            <p>
              {sourceMode === 'upload'
                ? 'อัปโหลดรูปใบหน้าเพื่อรันการสแกนทดสอบ'
                : 'เปิดกล้อง หรือสลับไปโหมดอัปโหลดรูป'}
            </p>
            <span className="camera-hint">TEST PROTOCOL · LOCAL ONLY · NO CLOUD</span>
          </div>
        )}

        <div className="view-corner top-left" />
        <div className="view-corner bottom-right" />
        {(cameraOn || sourceMode === 'upload') && (
          <span className="live-label">
            <i /> {sourceMode === 'upload' ? 'STATIC · SCAN' : 'LIVE · LOCAL'}
          </span>
        )}
        {scanning && <div className="lab-scanning" aria-live="polite">SCANNING…</div>}
      </div>

      <div className="camera-toolbar">
        <div>
          <p role="status">{scanSummary}</p>
          <small>{engineStatus}</small>
          {uploadName && sourceMode === 'upload' && (
            <small className="upload-meta">FILE · {uploadName}</small>
          )}
        </div>

        {sourceMode === 'upload' ? (
          <div className="camera-actions">
            <button
              className="button button-outline"
              type="button"
              disabled={!uploadName}
              onClick={onClearUpload}
            >
              <Trash2 size={17} aria-hidden="true" />
              ล้างรูป
            </button>
            <button
              className="button button-lime"
              type="button"
              disabled={!modelsReady || scanning}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={17} aria-hidden="true" />
              {scanning ? 'กำลังสแกน…' : uploadName ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) onUpload(file);
              }}
            />
          </div>
        ) : (
          <div className="camera-actions">
            <button
              className="button button-outline"
              type="button"
              disabled={!starting && !cameraOn}
              onClick={onStop}
            >
              <VideoOff size={17} aria-hidden="true" />
              ปิดกล้อง
            </button>
            <button
              className="button button-lime"
              type="button"
              disabled={starting || cameraOn}
              onClick={onStart}
            >
              <Video size={17} aria-hidden="true" />
              {starting ? 'กำลังเปิด…' : 'เปิดกล้อง'}
            </button>
          </div>
        )}
      </div>

      <div className="metrics">
        <div>
          <span><Users size={12} aria-hidden="true" /> enrolled</span>
          <strong>{String(metricPeople).padStart(2, '0')}</strong>
        </div>
        <div>
          <span><Scan size={12} aria-hidden="true" /> faces</span>
          <strong>{metricFaces}</strong>
        </div>
        <div>
          <span><Timer size={12} aria-hidden="true" /> latency</span>
          <strong>{metricLatency} <small>ms</small></strong>
        </div>
      </div>
    </motion.section>
  );
}
