import { useRef } from 'react';
import { ImagePlus, Loader2, Trash2, UserPlus } from 'lucide-react';

export default function AddPeople({
  personName,
  onNameChange,
  consent,
  onConsentChange,
  profiles,
  modelsReady,
  storageReady,
  enrolling,
  onEnroll,
  onDelete,
  onClearAll,
  onGoScan,
}) {
  const fileRef = useRef(null);
  const canUpload = modelsReady && storageReady && !enrolling;

  return (
    <section className="add-people">
      <div className="step-card">
        <p className="step-kicker">ขั้นตอนที่ 1</p>
        <h2>อัปโหลดรูปเข้าสู่ระบบ</h2>
        <p className="step-lead">ใส่ชื่อ แล้วเลือกรูปที่มีใบหน้าคนเดียว ระบบจะจำใบหน้านั้นไว้ในเครื่องนี้</p>

        <label htmlFor="person-name">ชื่อ</label>
        <input
          id="person-name"
          type="text"
          maxLength={60}
          placeholder="เช่น สมชาย"
          autoComplete="off"
          value={personName}
          disabled={enrolling}
          onChange={(event) => onNameChange(event.target.value)}
        />

        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            disabled={enrolling}
            onChange={(event) => onConsentChange(event.target.checked)}
          />
          <span>ยินยอมบันทึกลักษณะใบหน้าในเบราว์เซอร์นี้</span>
        </label>

        <button
          type="button"
          className="button button-solid full"
          disabled={!canUpload}
          onClick={() => fileRef.current?.click()}
        >
          {enrolling ? (
            <>
              <Loader2 size={18} className="spin" aria-hidden="true" />
              กำลังเพิ่ม…
            </>
          ) : (
            <>
              <ImagePlus size={18} aria-hidden="true" />
              เลือกรูปจากอัลบั้ม
            </>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onEnroll(file);
          }}
        />
        {!modelsReady && <p className="helper">กำลังโหลดโมเดล…</p>}
      </div>

      <div className="profiles-card">
        <div className="list-heading">
          <h2>
            คนในระบบ <span>{profiles.length}</span>
          </h2>
          <button
            className="text-button"
            type="button"
            disabled={!profiles.length}
            onClick={onClearAll}
          >
            <Trash2 size={13} aria-hidden="true" />
            ลบทั้งหมด
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="empty-list">
            <UserPlus size={28} strokeWidth={1.5} aria-hidden="true" />
            <p>ยังไม่มีคนในระบบ</p>
            <small>อัปโหลดรูปด้านบนเพื่อเพิ่มคน</small>
          </div>
        ) : (
          <>
            <ul className="profile-list">
              {profiles.map((person) => (
                <li key={person.id}>
                  <span className="avatar">
                    {Array.from(person.name).slice(0, 1).join('').toUpperCase()}
                  </span>
                  <div className="profile-info">
                    <strong>{person.name}</strong>
                    <small>พร้อมสแกน</small>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onDelete(person.id)}
                  >
                    ลบ
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="button button-ghost full" onClick={onGoScan}>
              ไปเฝ้าบ้านด้วยกล้อง
            </button>
          </>
        )}
      </div>
    </section>
  );
}
