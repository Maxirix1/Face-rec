import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

export default function ProfilesList({ profiles, storageReady, onDelete, onClearAll }) {
  return (
    <section className="profiles-card" aria-labelledby="profiles-heading">
      <div className="list-heading">
        <h2 id="profiles-heading">
          Profiles <span>{profiles.length}</span>
        </h2>
        <button
          className="text-button"
          type="button"
          disabled={storageReady && profiles.length === 0}
          onClick={onClearAll}
        >
          <Trash2 size={13} aria-hidden="true" />
          Clear
        </button>
      </div>

      <ul className="profile-list">
        <AnimatePresence initial={false}>
          {profiles.map((person) => (
            <motion.li
              key={person.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="avatar">
                {Array.from(person.name).slice(0, 1).join('').toUpperCase()}
              </span>
              <div className="profile-info">
                <strong>{person.name}</strong>
                <small>{person.descriptors.length} samples</small>
              </div>
              <button
                type="button"
                className="text-button"
                aria-label={`ลบ ${person.name}`}
                onClick={() => onDelete(person.id)}
              >
                Remove
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {profiles.length === 0 && (
        <div className="empty-list">
          <p>No profiles yet</p>
        </div>
      )}
    </section>
  );
}
