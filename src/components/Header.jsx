import { motion } from 'framer-motion';
import { FlaskConical, Cpu } from 'lucide-react';

export default function Header({ engineStatus, modelsReady }) {
  return (
    <motion.header
      className="site-header"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <a className="brand" href="./" aria-label="Face Reg Lab หน้าหลัก">
        <span className="brand-icon">
          <FlaskConical size={22} strokeWidth={2} aria-hidden="true" />
        </span>
        <span>
          face reg lab
          <small>LOCAL FACE RECOGNITION TEST BENCH</small>
        </span>
      </a>
      <div className="local-badge">
        <Cpu size={15} strokeWidth={2.2} aria-hidden="true" />
        <span className={`status-dot ${modelsReady ? 'ready' : ''}`} />
        <span className="badge-text">{modelsReady ? 'ENGINE READY' : 'LOADING MODEL'}</span>
        <span className="badge-detail">{engineStatus}</span>
      </div>
    </motion.header>
  );
}
