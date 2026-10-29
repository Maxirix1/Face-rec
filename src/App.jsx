import { useEffect, useState } from 'react';
import Notice from './components/Notice.jsx';
import Header from './components/Header.jsx';
import AddPeople from './components/AddPeople.jsx';
import ScanCamera from './components/ScanCamera.jsx';
import GuardSettings from './components/GuardSettings.jsx';
import { useFaceRegistry } from './hooks/useFaceRegistry.js';

export default function App() {
  const face = useFaceRegistry();
  const [tab, setTab] = useState('add');

  useEffect(() => {
    if (tab === 'watch' || tab === 'scan') {
      face.changeSourceMode('camera');
      if (
        face.profiles.length > 0
        && !face.cameraOn
        && !face.starting
        && face.modelsReady
      ) {
        void face.startCamera();
      }
      return undefined;
    }
    face.stopCamera();
    face.clearUpload();
    return undefined;
    // intentionally only react to tab / readiness / roster size
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, face.modelsReady, face.profiles.length]);

  return (
    <div className={`app-shell tab-${tab}`}>
      <Header engineStatus={face.engineStatus} modelsReady={face.modelsReady} />

      <nav className="mode-tabs" aria-label="โหมดใช้งาน">
        <button
          type="button"
          className={tab === 'add' ? 'active' : ''}
          onClick={() => setTab('add')}
        >
          ครอบครัว
        </button>
        <button
          type="button"
          className={tab === 'watch' ? 'active' : ''}
          onClick={() => {
            face.updateGuardConfig({ watchMode: true });
            setTab('watch');
          }}
        >
          เฝ้าบ้าน
        </button>
        <button
          type="button"
          className={tab === 'settings' ? 'active' : ''}
          onClick={() => setTab('settings')}
        >
          ตั้งค่า
        </button>
      </nav>

      <main>
        <Notice notice={face.notice} onDismiss={face.clearNotice} />

        {tab === 'add' ? (
          <AddPeople
            personName={face.personName}
            onNameChange={face.setPersonName}
            consent={face.consent}
            onConsentChange={face.handleConsentChange}
            profiles={face.profiles}
            modelsReady={face.modelsReady}
            storageReady={face.storageReady}
            enrolling={face.enrolling}
            onEnroll={face.enrollFromPhoto}
            onDelete={face.deleteProfile}
            onClearAll={face.clearAllProfiles}
            onGoScan={() => {
              face.updateGuardConfig({ watchMode: true });
              setTab('watch');
            }}
          />
        ) : null}

        {tab === 'watch' ? (
          <ScanCamera
            videoRef={face.videoRef}
            canvasRef={face.canvasRef}
            cameraOn={face.cameraOn}
            starting={face.starting}
            modelsReady={face.modelsReady}
            scanSummary={face.scanSummary}
            matchedName={face.matchedName}
            strangerLabel={face.strangerLabel}
            profileCount={face.profiles.length}
            aspectRatio={face.aspectRatio}
            watchMode={face.guardConfig.watchMode}
            guardAlertStatus={face.guardAlertStatus}
            onStart={face.startCamera}
            onStop={face.stopCamera}
            onGoAdd={() => setTab('add')}
            onGoSettings={() => setTab('settings')}
          />
        ) : null}

        {tab === 'settings' ? (
          <GuardSettings
            guardConfig={face.guardConfig}
            onChange={face.updateGuardConfig}
            onTest={face.testGuardAlert}
            onSyncUp={face.syncFamilyToVps}
            onSyncDown={face.syncFamilyFromVps}
            guardAlertStatus={face.guardAlertStatus}
            lastGuardAlertAt={face.lastGuardAlertAt}
          />
        ) : null}
      </main>
    </div>
  );
}
