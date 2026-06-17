/** money.ts — Todo monto se representa como INTEGER en unidades menores (centavos).
 *  Nunca float/double para dinero. Branded type para evitar mezclar con números crudos. */

export type Money = number & { readonly __brand: 'Money' };

export type CurrencyCode = 'GTQ' | 'USD' | 'MXN' | 'EUR';

interface CurrencyMeta {
  /** Dígitos decimales (unidades menores) */
  decimals: number;
  locale: string;
}

const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  GTQ: { decimals: 2, locale: 'es-GT' },
  USD: { decimals: 2, locale: 'en-US' },
  MXN: { decimals: 2, locale: 'es-MX' },
  EUR: { decimals: 2, locale: 'es-ES' },
};

/** Construye un Money a partir de un entero de unidades menores (centavos). */
export function money(minorUnits: number): Money {
  if (!Number.isInteger(minorUnits)) {
    throw new Error(`Money debe ser entero en unidades menores, recibido: ${minorUnits}`);
  }
  return minorUnits as Money;
}

export const ZERO = money(0);

/** Redondeo bancario (half-even / "round half to even"). */
export function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff < 0.5) return floor;
  if (diff > 0.5) return floor + 1;
  // Exactamente .5 → al par más cercano
  return floor % 2 === 0 ? floor : floor + 1;
}

export function add(a: Money, b: Money): Money {
  return money(a + b);
}

export function subtract(a: Money, b: Money): Money {
  return money(a - b);
}

/** Multiplica por un escalar (p. ej. una tasa). Aplica redondeo bancario. */
export function multiply(a: Money, scalar: number): Money {
  return money(roundHalfEven(a * scalar));
}

/** Devuelve `percent`% de `a` (percent en [0..100]). Redondeo bancario. */
export function percentOf(a: Money, percent: number): Money {
  return money(roundHalfEven((a * percent) / 100));
}

export function isNegative(a: Money): boolean {
  return a < 0;
}

export function negate(a: Money): Money {
  return money(-a);
}

export function sum(values: Money[]): Money {
  return values.reduce<Money>((acc, v) => add(acc, v), ZERO);
}

/** Formatea como moneda con Intl.NumberFormat. */
export function formatMoney(value: Money, currency: CurrencyCode = 'GTQ'): string {
  const meta = CURRENCIES[currency];
  const major = value / 10 ** meta.decimals;
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(major);
}

/** Formatea solo el número (sin símbolo) — útil para inputs. */
export function formatAmount(value: Money, currency: CurrencyCode = 'GTQ'): string {
  const meta = CURRENCIES[currency];
  const major = value / 10 ** meta.decimals;
  return new Intl.NumberFormat(CURRENCIES[currency].locale, {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(major);
}

/** Convierte el string de input del usuario a Money.
 *  Acepta coma o punto como separador decimal/miles según heurística.
 *  Ejemplos: "1,250.50" → 125050 ; "1.250,50" → 125050 ; "99" → 9900. */
export function parseMoney(input: string, currency: CurrencyCode = 'GTQ'): Money {
  const meta = CURRENCIES[currency];
  let s = input.trim().replace(/[^\d.,-]/g, '');
  if (s === '' || s === '-') return ZERO;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  let decimalSep: ',' | '.' | null = null;
  if (lastComma !== -1 && lastDot !== -1) {
    decimalSep = lastComma > lastDot ? ',' : '.';
  } else if (lastComma !== -1) {
    // Solo coma: es decimal si hay <=2 dígitos después; si no, es separador de miles
    const after = s.length - lastComma - 1;
    decimalSep = after <= 2 ? ',' : null;
  } else if (lastDot !== -1) {
    const after = s.length - lastDot - 1;
    decimalSep = after <= 2 ? '.' : null;
  }

  let intPart: string;
  let fracPart: string;
  if (decimalSep) {
    const idx = s.lastIndexOf(decimalSep);
    intPart = s.slice(0, idx).replace(/[.,]/g, '');
    fracPart = s.slice(idx + 1).replace(/[.,]/g, '');
  } else {
    intPart = s.replace(/[.,]/g, '');
    fracPart = '';
  }

  const negative = intPart.startsWith('-');
  intPart = intPart.replace('-', '');
  fracPart = (fracPart + '0'.repeat(meta.decimals)).slice(0, meta.decimals);

  const minor = parseInt(intPart || '0', 10) * 10 ** meta.decimals + parseInt(fracPart || '0', 10);
  return money(negative ? -minor : minor);
}
