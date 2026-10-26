import { Camera, RotateCcw, Save, Check } from 'lucide-react';

const STEP_LABELS = ['Front', 'Slight turn', 'Angle'];

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
    <section className="registration-card" aria-labelledby="register-heading">
      <h2 id="register-heading">Register</h2>

      <form onSubmit={onSave}>
        <label htmlFor="person-name">Name</label>
        <input
          id="person-name"
          name="name"
          type="text"
          maxLength={60}
          placeholder="Name"
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
          <span>ยินยอมบันทึกลักษณะใบหน้าในเบราว์เซอร์นี้</span>
        </label>

        <div className="sample-heading">
          <span>Samples</span>
          <strong>{sampleCount} / {samplesPerPerson}</strong>
        </div>

        <div className="sample-steps" aria-label={`ตัวอย่าง ${sampleCount} จาก ${samplesPerPerson}`}>
          {STEP_LABELS.map((label, index) => (
            <div key={label} className={index < sampleCount ? 'complete' : ''}>
              <b>{index < sampleCount ? <Check size={11} strokeWidth={3} /> : index + 1}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <p className="helper" aria-live="polite">{captureHelp}</p>

        <button className="button button-solid full" type="button" disabled={!canCapture} onClick={onCapture}>
          {sampleCount === samplesPerPerson
            ? <>Done <Check size={16} aria-hidden="true" /></>
            : <>Capture {sampleCount + 1}/{samplesPerPerson} <Camera size={16} aria-hidden="true" /></>}
        </button>

        <div className="save-row">
          <button className="button button-solid" type="submit" disabled={!canSave}>
            <Save size={15} aria-hidden="true" />
            Save
          </button>
          <button className="text-button" type="button" disabled={sampleCount === 0} onClick={onReset}>
            <RotateCcw size={13} aria-hidden="true" />
            Reset
          </button>
        </div>
      </form>
    </section>
  );
}
