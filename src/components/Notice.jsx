import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function Notice({ notice, onDismiss }) {
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          className={`notice ${notice.error ? 'error' : ''}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.28 }}
        >
          <span className="notice-icon">
            {notice.error
              ? <AlertCircle size={18} aria-hidden="true" />
              : <CheckCircle2 size={18} aria-hidden="true" />}
          </span>
          <p>{notice.message}</p>
          {notice.retry && (
            <button type="button" className="notice-retry" onClick={notice.retry}>
              <RefreshCw size={14} aria-hidden="true" />
              ลองใหม่
            </button>
          )}
          <button type="button" className="notice-close" onClick={onDismiss} aria-label="ปิดข้อความ">
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
