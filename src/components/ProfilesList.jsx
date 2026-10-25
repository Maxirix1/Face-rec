import { AnimatePresence, motion } from 'framer-motion';
import { UsersRound, Trash2, CircleDot } from 'lucide-react';

export default function ProfilesList({ profiles, storageReady, onDelete, onClearAll }) {
  return (
    <motion.section
      className="profiles-card"
      aria-labelledby="profiles-heading"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="list-heading">
        <h2 id="profiles-heading">
          <UsersRound size={16} aria-hidden="true" />
          โปรไฟล์ในแล็บ
          <span>{profiles.length}</span>
        </h2>
        <button
          className="text-button danger"
          type="button"
          disabled={storageReady && profiles.length === 0}
          onClick={onClearAll}
        >
          <Trash2 size={13} aria-hidden="true" />
          ลบทั้งหมด
        </button>
      </div>

      <ul className="profile-list">
        <AnimatePresence initial={false}>
          {profiles.map((person) => (
            <motion.li
              key={person.id}
              layout
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
            >
              <span className="avatar">
                {Array.from(person.name).slice(0, 1).join('').toUpperCase()}
              </span>
              <div className="profile-info">
                <strong>{person.name}</strong>
                <small>
                  {person.descriptors.length} ตัวอย่าง ·{' '}
                  {new Date(person.createdAt).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </small>
              </div>
              <button
                type="button"
                className="text-button danger"
                aria-label={`ลบใบหน้าของ ${person.name}`}
                onClick={() => onDelete(person.id)}
              >
                ลบ
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {profiles.length === 0 && (
        <div className="empty-list">
          <CircleDot size={28} strokeWidth={1.4} aria-hidden="true" />
          <p>ยังไม่มีโปรไฟล์ในแล็บ</p>
          <small>ลงทะเบียนจากกล้องหรือรูปอัปโหลดได้ที่แผงด้านบน</small>
        </div>
      )}
    </motion.section>
  );
}
