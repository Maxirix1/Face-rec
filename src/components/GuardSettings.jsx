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

  return (
    <section className="add-people">
      <div className="step-card">
        <p className="step-kicker">Pi ↔ VPS</p>
        <h2>ตั้งค่า Home Guard</h2>
        <p className="step-lead">
          เครื่องนี้ (VPS) ไม่ได้ค้นหา Pi เอง — Pi เป็นฝ่ายยิง HTTP มาหา Guard URL
          รายชื่อใบหน้าต้องซิงก์ผ่าน VPS ให้ Pi กับมือถือใช้ชุดเดียวกัน
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

        <label htmlFor="stream-path">Stream path</label>
        <input
          id="stream-path"
          type="text"
          value={guardConfig.streamPath}
          onChange={(e) => onChange({ streamPath: e.target.value })}
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
        <h2>Pi ต่อกับเครื่องนี้อย่างไร</h2>
        <p className="step-lead">
          1) คัดลอก face ไป Pi แล้วรัน `HOST=0.0.0.0 PORT=5188 npm start`<br />
          2) บน Pi เปิดแท็บตั้งค่า → Guard URL = `https://guard.effecttier.com` + Pi Token<br />
          3) บนเครื่องนี้ (หรือมือถือ) ลงทะเบียนครอบครัว → กด “ซิงก์ขึ้น VPS”<br />
          4) บน Pi กด “ดึงจาก VPS” ให้ได้รายชื่อชุดเดียว<br />
          5) เปิดโหมดเฝ้าบ้านบน Pi — เจอคนแปลกหน้า Pi จะ POST ไป VPS เอง<br />
          6) (มีกล้องแล้ว) ffmpeg ดัน RTSP ไป MediaMTX บน VPS
        </p>
      </div>
    </section>
  );
}
