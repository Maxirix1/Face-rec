import { motion } from 'framer-motion';
import { ChevronDown, Upload, Video } from 'lucide-react';

export default function Hero() {
  return (
    <motion.section
      className="hero hero-compact"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="hero-copy">
        <p className="eyebrow">PROTOCOL · LOCAL · OFFLINE</p>
        <h1 className="brand-hero">Face Reg Lab</h1>
        <p className="hero-lead">
          ทดสอบจดจำใบหน้า — เปิดกล้องหรืออัปโหลดรูป แล้วเทียบกับโปรไฟล์บนเครื่องนี้
        </p>
      </div>
      <div className="hero-cta-row">
        <motion.a
          className="hero-cta"
          href="#workspace"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          เปิดกล้อง
          <ChevronDown size={18} aria-hidden="true" />
        </motion.a>
        <span className="hero-chips">
          <span><Video size={13} aria-hidden="true" /> Live</span>
          <span><Upload size={13} aria-hidden="true" /> Upload</span>
        </span>
      </div>
    </motion.section>
  );
}
