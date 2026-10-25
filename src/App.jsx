import { motion } from 'framer-motion';
import { Database, Shield, Beaker } from 'lucide-react';
import ParallaxScene from './components/ParallaxScene.jsx';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import Notice from './components/Notice.jsx';
import LabStage from './components/LabStage.jsx';
import RegisterPanel from './components/RegisterPanel.jsx';
import ProfilesList from './components/ProfilesList.jsx';
import ResultsBar from './components/ResultsBar.jsx';
import { useFaceRegistry } from './hooks/useFaceRegistry.js';

export default function App() {
  const face = useFaceRegistry();

  return (
    <>
      <ParallaxScene />
      <Header engineStatus={face.engineStatus} modelsReady={face.modelsReady} />
      <main>
        <Hero />
        <Notice notice={face.notice} onDismiss={face.clearNotice} />

        <div id="workspace" className="workspace workspace-camera-first">
          <LabStage
            videoRef={face.videoRef}
            canvasRef={face.canvasRef}
            imageRef={face.imageRef}
            sourceMode={face.sourceMode}
            cameraOn={face.cameraOn}
            cameraState={face.cameraState}
            starting={face.starting}
            scanning={face.scanning}
            scanSummary={face.scanSummary}
            engineStatus={face.engineStatus}
            metricPeople={face.profiles.length}
            metricFaces={face.metricFaces}
            metricLatency={face.metricLatency}
            aspectRatio={face.aspectRatio}
            uploadName={face.uploadName}
            modelsReady={face.modelsReady}
            onStart={face.startCamera}
            onStop={face.stopCamera}
            onUpload={face.scanImageFile}
            onClearUpload={face.clearUpload}
            onModeChange={face.changeSourceMode}
          />

          <aside className="side-panel">
            <RegisterPanel
              personName={face.personName}
              onNameChange={face.setPersonName}
              consent={face.consent}
              onConsentChange={face.handleConsentChange}
              samples={face.samples}
              samplesPerPerson={face.samplesPerPerson}
              captureHelp={face.captureHelp}
              canCaptureSource={face.canCaptureSource}
              modelsReady={face.modelsReady}
              storageReady={face.storageReady}
              onCapture={face.captureSample}
              onReset={face.resetSamples}
              onSave={face.saveProfile}
            />
            <ProfilesList
              profiles={face.profiles}
              storageReady={face.storageReady}
              onDelete={face.deleteProfile}
              onClearAll={face.clearAllProfiles}
            />
          </aside>
        </div>

        <ResultsBar
          results={face.results}
          threshold={face.threshold}
          onThresholdChange={face.updateThreshold}
        />

        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p>
            <Database size={12} aria-hidden="true" />
            Lab เก็บเฉพาะเวกเตอร์ใบหน้า · ไม่บันทึกภาพถ่ายหรือวิดีโอ
          </p>
          <span>
            <Beaker size={11} aria-hidden="true" />
            Test bench · ยังไม่มีระบบตรวจจับการปลอมด้วยภาพถ่าย
            <Shield size={11} aria-hidden="true" />
          </span>
        </motion.footer>
      </main>
    </>
  );
}
