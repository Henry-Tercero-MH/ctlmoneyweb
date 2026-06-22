import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Muestra el modal centrado en pantalla en vez de anclado abajo. */
  centered?: boolean;
}

export function BottomSheet({ open, title, onClose, children, centered = false }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={centered ? styles.backdropCentered : styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            {centered && (
              <motion.div
                className={styles.centeredCard}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.8, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              >
                <header className={styles.header}>
                  <h2 className={styles.title}>{title}</h2>
                  <button className={styles.close} onClick={onClose} aria-label="Cerrar">
                    <X size={20} strokeWidth={2} />
                  </button>
                </header>
                <div className={styles.body}>{children}</div>
              </motion.div>
            )}
          </motion.div>

          {!centered && (
            <motion.div
              className={styles.sheet}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <header className={styles.header}>
                <span className={styles.grabber} aria-hidden />
                <h2 className={styles.title}>{title}</h2>
                <button className={styles.close} onClick={onClose} aria-label="Cerrar">
                  <X size={20} strokeWidth={2} />
                </button>
              </header>
              <div className={styles.body}>{children}</div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
