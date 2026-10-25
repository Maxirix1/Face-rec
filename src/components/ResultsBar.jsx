import { motion } from 'framer-motion';
import { Sparkles, SlidersHorizontal } from 'lucide-react';

export default function ResultsBar({ results, threshold, onThresholdChange }) {
  return (
    <motion.section
      className="results-bar"
      aria-labelledby="results-heading"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="results-main">
        <span className="section-kicker">
          <Sparkles size={11} aria-hidden="true" />
          MATCH OUTPUT
        </span>
        <h2 id="results-heading">ผลสแกนล่าสุด</h2>
        <div className="result-items">
          {results.map((item, index) => (
            item.muted ? (
              <span key={`muted-${index}`} className="muted">{item.label}</span>
            ) : (
              <motion.span
                key={`${item.label}-${index}`}
                className={`result-tag${item.matched ? '' : ' unknown'}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {item.label}
                {item.distance != null && (
                  <small>ระยะห่าง {item.distance.toFixed(3)}</small>
                )}
              </motion.span>
            )
          ))}
        </div>
      </div>

      <div className="threshold-setting">
        <label htmlFor="threshold">
          <span>
            <SlidersHorizontal size={13} aria-hidden="true" />
            ระยะห่างสูงสุดที่ยอมรับ
          </span>
          <output id="threshold-value" htmlFor="threshold">
            {threshold.toFixed(2)}
          </output>
        </label>
        <input
          id="threshold"
          type="range"
          min="0.35"
          max="0.70"
          step="0.01"
          value={threshold}
          onChange={(event) => onThresholdChange(event.target.value)}
        />
        <div>
          <span>เข้มงวดขึ้น</span>
          <span>ผ่อนปรนขึ้น</span>
        </div>
        <p>ค่ายิ่งต่ำ ใบหน้ายิ่งต้องใกล้เคียง · ไม่ใช่เปอร์เซ็นต์ความมั่นใจ</p>
      </div>
    </motion.section>
  );
}
