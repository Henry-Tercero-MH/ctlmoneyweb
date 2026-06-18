import { Delete } from 'lucide-react';
import styles from './NumericKeyboard.module.css';

interface NumericKeyboardProps {
  onKey: (key: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

export function NumericKeyboard({ onKey }: NumericKeyboardProps) {
  return (
    <div className={styles.keyboard} role="group" aria-label="Teclado numérico">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={`${styles.key} ${k === 'del' ? styles.del : ''}`}
          onClick={() => onKey(k)}
          aria-label={k === 'del' ? 'Borrar' : k}
        >
          {k === 'del' ? <Delete size={22} strokeWidth={1.75} /> : k}
        </button>
      ))}
    </div>
  );
}
