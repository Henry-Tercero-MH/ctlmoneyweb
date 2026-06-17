import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from './toast';
import styles from './Toaster.module.css';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`${styles.toast} ${styles[t.tone]}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
