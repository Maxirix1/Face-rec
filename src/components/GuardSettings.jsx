export default function GuardSettings({
  guardConfig,
  onChange,
  onTest,
  onSyncUp,
  onSyncDown,
  guardAlertStatus,
  lastGuardAlertAt,
}) {
  const ready = Boolean(guardConfig.guardUrl && guardConfig.piToken);
  const isRtsp = guardConfig.videoSource !== 'browser';

  return (
    <section className="add-people">
      <div className="step-card">
        <p className="step-kicker">กล้อง · RTSP</p>
        <h2>แหล่งวิดีโอเฝ้าบ้าน</h2>
        <p className="step-lead">
          โหมดเฝ้าบ้านใช้กล้องจาก Ubuntu server ผ่าน RTSP → MediaMTX → WebRTC (WHEP)
          ไม่ใช้กล้องของเบราว์เซอร์ (มือถือ/โน้ต) เป็นค่าเริ่มต้น
        </p>

        <label htmlFor="video-source">แหล่งกล้อง</label>
        <select
          id="video-source"
          value={isRtsp ? 'rtsp' : 'browser'}
          onChange={(e) => onChange({ videoSource: e.target.value })}
        >
          <option value="rtsp">RTSP / MediaMTX (แนะนำ · Ubuntu + กล้อง)</option>
          <option value="browser">กล้องเบราว์เซอร์ (ทดสอบเท่านั้น)</option>
        </select>

        <label htmlFor="stream-path">Stream path (MediaMTX)</label>
        <input
          id="stream-path"
          type="text"
          value={guardConfig.streamPath}
          onChange={(e) => onChange({ streamPath: e.target.value })}
        />

        <label htmlFor="whep-url">WHEP URL (ว่าง = ใช้ /webrtc/… ของเครื่องนี้)</label>
        <input
          id="whep-url"
          type="url"
          value={guardConfig.whepUrl}
          placeholder="http://127.0.0.1:8889/cam1/whep"
          onChange={(e) => onChange({ whepUrl: e.target.value })}
        />
        <p className="helper">
          ว่างไว้ถ้า face กับ MediaMTX อยู่เครื่องเดียวกัน (proxy ในตัว)
          หรือใส่ URL ของ MediaMTX / guard.effecttier.com โดยตรง
        </p>
      </div>

      <div className="step-card">
        <p className="step-kicker">Pi ↔ VPS</p>
        <h2>ตั้งค่า Home Guard</h2>
        <p className="step-lead">
          แจ้งเตือนคนแปลกหน้าไป VPS · ครอบครัวเปิด guard.effecttier.com ดูภาพจาก RTSP ชุดเดียวกัน
        </p>

        <label className="consent">
          <input
            type="checkbox"
            checked={guardConfig.watchMode}
            onChange={(e) => onChange({ watchMode: e.target.checked })}
          />
          <span>เปิดโหมดเฝ้าบ้าน (แจ้งเตือนเมื่อเจอคนแปลกหน้า)</span>
        </label>

        <label htmlFor="guard-url">Guard URL (VPS)</label>
        <input
          id="guard-url"
          type="url"
          value={guardConfig.guardUrl}
          placeholder="https://guard.effecttier.com"
          onChange={(e) => onChange({ guardUrl: e.target.value })}
        />

        <label htmlFor="pi-token">Pi Token</label>
        <input
          id="pi-token"
          type="password"
          autoComplete="off"
          value={guardConfig.piToken}
          placeholder="จาก VPS home-guard .env"
          onChange={(e) => onChange({ piToken: e.target.value })}
        />

        <label htmlFor="cooldown">Cooldown แจ้งเตือน (วินาที)</label>
        <input
          id="cooldown"
          type="number"
          min={10}
          max={600}
          value={guardConfig.alertCooldownSec}
          onChange={(e) => onChange({ alertCooldownSec: Number(e.target.value) || 45 })}
        />

        <button
          type="button"
          className="button button-solid full"
          disabled={!ready || guardAlertStatus === 'sending'}
          onClick={onTest}
        >
          {guardAlertStatus === 'sending' ? 'กำลังทดสอบ…' : 'ทดสอบแจ้งเตือนไป VPS'}
        </button>

        <div className="button-row" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
          <button type="button" className="button full" disabled={!ready} onClick={onSyncUp}>
            ซิงก์ครอบครัวขึ้น VPS
          </button>
          <button type="button" className="button full" disabled={!ready} onClick={onSyncDown}>
            ดึงครอบครัวจาก VPS
          </button>
        </div>

        <p className="helper">
          สถานะ: {guardAlertStatus}
          {lastGuardAlertAt
            ? ` · ล่าสุด ${new Date(lastGuardAlertAt).toLocaleTimeString('th-TH')}`
            : ''}
          {!ready ? ' · ยังใส่ Token ไม่ครบ' : ''}
        </p>
      </div>

      <div className="step-card">
        <h2>Ubuntu local + RTSP</h2>
        <p className="step-lead">
          1) รัน MediaMTX บน Ubuntu (หรือใช้ชุด home-guard)<br />
          2) ดันกล้องเข้า path `cam1` เช่น<br />
          <code style={{ display: 'block', margin: '0.5rem 0', wordBreak: 'break-all' }}>
            ffmpeg -rtsp_transport tcp -i rtsp://USER:PASS@CAM_IP/stream -c copy -f rtsp rtsp://127.0.0.1:8554/cam1
          </code>
          หรือตั้ง MediaMTX ให้ pull RTSP ตรงๆ<br />
          3) รัน face: <code>HOST=0.0.0.0 PORT=5188 npm start</code><br />
          4) แท็บเฝ้าบ้าน → เห็นภาพจาก RTSP แล้วสแกนใบหน้า<br />
          5) ครอบครัวดูสตรีมชุดเดียวกันที่ guard.effecttier.com
        </p>
      </div>
    </section>
  );
}
