import { useRef } from 'react';
import {
  Video, VideoOff, Users, Scan, Timer, Aperture,
  Upload, ImagePlus, Trash2,
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
    <section className="lab-stage-card" aria-labelledby="lab-heading">
      <div className="lab-tabs" role="tablist" aria-label="โหมดสแกน">
        <button
          type="button"
          role="tab"
          aria-selected={sourceMode !== 'upload'}
          className={`lab-tab ${sourceMode !== 'upload' ? 'active' : ''}`}
          onClick={() => onModeChange('camera')}
        >
          <Aperture size={15} aria-hidden="true" />
          Camera
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={sourceMode === 'upload'}
          className={`lab-tab ${sourceMode === 'upload' ? 'active' : ''}`}
          onClick={() => onModeChange('upload')}
        >
          <Upload size={15} aria-hidden="true" />
          Upload
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
          alt={uploadName ? `รูป: ${uploadName}` : ''}
        />
        <canvas ref={canvasRef} aria-hidden="true" />

        {empty && (
          <div className="camera-empty">
            <h3 id="lab-heading">Ready</h3>
            <p>
              {sourceMode === 'upload'
                ? 'อัปโหลดรูปเพื่อสแกน'
                : 'เปิดกล้องเพื่อเริ่ม'}
            </p>
          </div>
        )}

        {(cameraOn || sourceMode === 'upload') && (
          <span className="live-label">
            <i /> {sourceMode === 'upload' ? 'Image' : cameraState}
          </span>
        )}
        {scanning && <div className="lab-scanning" aria-live="polite">Scanning</div>}
      </div>

      <div className="camera-toolbar">
        <div>
          <p role="status">{scanSummary}</p>
          <small>{engineStatus}</small>
          {uploadName && sourceMode === 'upload' && (
            <small className="upload-meta">{uploadName}</small>
          )}
        </div>

        {sourceMode === 'upload' ? (
          <div className="camera-actions">
            <button className="button button-ghost" type="button" disabled={!uploadName} onClick={onClearUpload}>
              <Trash2 size={16} aria-hidden="true" />
              Clear
            </button>
            <button
              className="button button-solid"
              type="button"
              disabled={!modelsReady || scanning}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus size={16} aria-hidden="true" />
              {scanning ? 'Scanning…' : uploadName ? 'Change' : 'Upload'}
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
            <button className="button button-ghost" type="button" disabled={!starting && !cameraOn} onClick={onStop}>
              <VideoOff size={16} aria-hidden="true" />
              Stop
            </button>
            <button className="button button-solid" type="button" disabled={starting || cameraOn} onClick={onStart}>
              <Video size={16} aria-hidden="true" />
              {starting ? 'Starting…' : 'Start'}
            </button>
          </div>
        )}
      </div>

      <div className="metrics">
        <div>
          <span><Users size={12} aria-hidden="true" /> People</span>
          <strong>{metricPeople}</strong>
        </div>
        <div>
          <span><Scan size={12} aria-hidden="true" /> Faces</span>
          <strong>{metricFaces}</strong>
        </div>
        <div>
          <span><Timer size={12} aria-hidden="true" /> ms</span>
          <strong>{metricLatency}</strong>
        </div>
      </div>
    </section>
  );
}
