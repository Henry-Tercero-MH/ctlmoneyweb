/** Espejo en TypeScript de los tokens de tokens.css.
 *  Para uso en JS (p. ej. colores de series en recharts). No duplicar valores
 *  en componentes: importar siempre desde aquí o usar las variables CSS. */

export const colors = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surface2: 'var(--color-surface-2)',
  border: 'var(--color-border)',
  primary: 'var(--color-primary)',
  primaryDim: 'var(--color-primary-dim)',
  onPrimary: 'var(--color-on-primary)',
  accent: 'var(--color-accent)',
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textDisabled: 'var(--color-text-disabled)',
  income: 'var(--color-income)',
  expense: 'var(--color-expense)',
  warning: 'var(--color-warning)',
  neutral: 'var(--color-neutral)',
} as const;

/** Valores absolutos para contextos que no resuelven variables CSS (canvas, libs). */
export const palette = {
  mustard: '#d4a017',
  mustardBright: '#e8b923',
  black: '#161513',
  income: '#3f7a3a',
  expense: '#a8442c',
} as const;
