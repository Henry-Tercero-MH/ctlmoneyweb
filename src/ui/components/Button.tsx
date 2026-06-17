import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  block?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  block = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${styles.btn} ${styles[variant]} ${block ? styles.block : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
