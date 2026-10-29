import { motion } from 'framer-motion';
import { UserPlus, Camera, RotateCcw, Save, Check } from 'lucide-react';

const STEP_LABELS = ['มองตรง', 'หันเล็กน้อย', 'เปลี่ยนมุม'];

export default function RegisterPanel({
  personName,
  onNameChange,
  consent,
  onConsentChange,
  samples,
  samplesPerPerson,
  captureHelp,
  canCaptureSource,
  modelsReady,
  storageReady,
  onCapture,
  onReset,
  onSave,
}) {
  const sampleCount = samples.length;
  const canCapture = canCaptureSource && modelsReady && storageReady && sampleCount < samplesPerPerson;
  const canSave = storageReady && sampleCount === samplesPerPerson && consent;

  return (
    <motion.section
      className="registration-card"
      aria-labelledby="register-heading"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="card-header">
        <div>
          <span className="section-kicker">ENROLL · LAB</span>
          <h2 id="register-heading">ลงทะเบียนโปรไฟล์ทดสอบ</h2>
        </div>
        <span className="step-icon" aria-hidden="true">
          <UserPlus size={18} strokeWidth={2} />
        </span>
      </div>

      <form onSubmit={onSave}>
        <label htmlFor="person-name">ชื่อที่แสดง</label>
        <input
          id="person-name"
          name="name"
          type="text"
          maxLength={60}
          placeholder="เช่น สมชาย หรือ Somchai"
          autoComplete="off"
          required
          value={personName}
          disabled={sampleCount > 0}
          onChange={(event) => onNameChange(event.target.value)}
        />

        <label className="consent">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => onConsentChange(event.target.checked)}
          />
          <span>ฉันยินยอมให้บันทึกข้อมูลลักษณะใบหน้าของฉันในเบราว์เซอร์นี้ เพื่อนำมาใช้จดจำใบหน้า</span>
        </label>

        <div className="sample-heading">
          <span>เก็บตัวอย่างใบหน้า</span>
          <strong>{sampleCount} / {samplesPerPerson}</strong>
        </div>

        <div
          className="sample-steps"
          aria-label={`ตัวอย่างใบหน้า ${sampleCount} จาก ${samplesPerPerson}`}
        >
          {STEP_LABELS.map((label, index) => (
            <div key={label} className={index < sampleCount ? 'complete' : ''}>
              <b>{index < sampleCount ? <Check size={11} strokeWidth={3} /> : index + 1}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <p className="helper" aria-live="polite">{captureHelp}</p>

        <button
          className="button button-dark full"
          type="button"
          disabled={!canCapture}
          onClick={onCapture}
        >
          {sampleCount === samplesPerPerson
            ? <>เก็บตัวอย่างครบแล้ว <Check size={16} aria-hidden="true" /></>
            : <>เก็บตัวอย่าง {sampleCount + 1} / {samplesPerPerson} <Camera size={16} aria-hidden="true" /></>}
        </button>

        <div className="save-row">
          <button className="button button-dark" type="submit" disabled={!canSave}>
            <Save size={15} aria-hidden="true" />
            บันทึกใบหน้า
          </button>
          <button
            className="text-button"
            type="button"
            disabled={sampleCount === 0}
            onClick={onReset}
          >
            <RotateCcw size={13} aria-hidden="true" />
            เริ่มใหม่
          </button>
        </div>
      </form>
    </motion.section>
  );
}
