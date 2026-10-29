import { Camera, Loader2, Users } from 'lucide-react';

export default function ScanCamera({
  videoRef,
  canvasRef,
  cameraOn,
  starting,
  modelsReady,
  scanSummary,
  matchedName,
  strangerLabel,
  profileCount,
  aspectRatio,
  watchMode,
  guardAlertStatus,
  onStart,
  onStop,
  onGoAdd,
  onGoSettings,
}) {
  return (
    <section className="scan-camera">
      <div className="step-card scan-intro">
        <p className="step-kicker">{watchMode ? 'โหมดเฝ้าบ้าน' : 'ขั้นตอนที่ 2'}</p>
        <h2>{watchMode ? 'ตรวจคนแปลกหน้า' : 'สแกนด้วยกล้อง'}</h2>
        <p className="step-lead">
          {!profileCount
            ? 'ยังไม่มีคนในครอบครัว · เพิ่มคนด้วยการอัปโหลดรูปก่อน'
            : watchMode
              ? `มี ${profileCount} คนในบ้าน · เจอคนที่ไม่ใช่ครอบครัวจะแจ้งเตือนไป VPS`
              : `มี ${profileCount} คนในระบบ · เมื่อเจอใบหน้าที่ตรงกันจะขึ้น Success`}
        </p>
        {!profileCount && (
          <button type="button" className="button button-ghost full" onClick={onGoAdd}>
            <Users size={16} aria-hidden="true" />
            ไปเพิ่มคนในครอบครัว
          </button>
        )}
        {watchMode && profileCount > 0 && (
          <button type="button" className="button button-ghost full" onClick={onGoSettings}>
            ตั้งค่า VPS / Token
          </button>
        )}
      </div>

      <div className="lab-stage-card scan-stage">
        <div className="camera-stage" style={{ aspectRatio: aspectRatio || '3 / 4' }}>
          <video
            ref={videoRef}
            className={cameraOn ? 'is-visible' : 'is-hidden'}
            autoPlay
            muted
            playsInline
            aria-label="กล้องสแกน"
          />
          <canvas ref={canvasRef} aria-hidden="true" />

          {!cameraOn && (
            <div className="camera-empty">
              <h3>{starting ? 'กำลังเปิดกล้อง…' : 'กล้องยังไม่เปิด'}</h3>
              <p>กดปุ่มด้านล่างเพื่อเริ่มเฝ้าบ้าน</p>
            </div>
          )}

          {matchedName ? (
            <div className="match-banner success" role="status" aria-live="polite">
              <strong>Success</strong>
              <span>คนในครอบครัว</span>
              <em>{matchedName}</em>
            </div>
          ) : strangerLabel && cameraOn ? (
            <div className="match-banner alert" role="status" aria-live="assertive">
              <strong>Alert</strong>
              <span>ไม่ใช่คนในครอบครัว</span>
              <em>{strangerLabel}</em>
              {guardAlertStatus === 'sending' && <span>กำลังแจ้ง VPS…</span>}
              {guardAlertStatus === 'sent' && <span>แจ้งเตือนแล้ว</span>}
            </div>
          ) : cameraOn ? (
            <div className="match-banner idle" role="status">
              <span>{scanSummary}</span>
            </div>
          ) : null}
        </div>

        <div className="camera-toolbar">
          <p role="status">{cameraOn ? scanSummary : 'พร้อมสแกนเมื่อเปิดกล้อง'}</p>
          <div className="camera-actions">
            {cameraOn ? (
              <button type="button" className="button button-ghost" onClick={onStop}>
                ปิดกล้อง
              </button>
            ) : (
              <button
                type="button"
                className="button button-solid"
                disabled={starting || !modelsReady || !profileCount}
                onClick={onStart}
              >
                {starting ? (
                  <>
                    <Loader2 size={16} className="spin" aria-hidden="true" />
                    กำลังเปิด…
                  </>
                ) : (
                  <>
                    <Camera size={16} aria-hidden="true" />
                    {watchMode ? 'เปิดเฝ้าบ้าน' : 'เปิดกล้องสแกน'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
