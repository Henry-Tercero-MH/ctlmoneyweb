/** budgetRule.ts — Regla 50/30/20: clasificación de categorías y cálculo. */

export type Bucket = 'needs' | 'wants' | 'savings';

/** Mapa de icono de categoría → bucket. Las no listadas caen en "deseos". */
export const BUCKET_BY_ICON: Record<string, Bucket> = {
  // Necesidades (50%)
  vivienda: 'needs',
  alimentacion: 'needs',
  transporte: 'needs',
  salud: 'needs',
  servicios: 'needs',
  educacion: 'needs',
  deudas: 'needs',
  imprevistos: 'needs',
  // Deseos (30%)
  entretenimiento: 'wants',
  ropa: 'wants',
  suscripciones: 'wants',
  regalos: 'wants',
  mascotas: 'wants',
  otros: 'wants',
};

export function bucketOfIcon(icon: string): Bucket {
  return BUCKET_BY_ICON[icon] ?? 'wants';
}

/** Porcentaje objetivo de cada bucket sobre el ingreso. */
export const RULE_TARGET: Record<Bucket, number> = { needs: 50, wants: 30, savings: 20 };

export const BUCKET_META: Record<
  Bucket,
  { label: string; color: string; desc: string; examples: string; higherIsBetter: boolean }
> = {
  needs: {
    label: 'Necesidades',
    color: '#60a5fa',
    desc: 'Gastos esenciales que no puedes evitar para vivir y trabajar.',
    examples: 'Vivienda, alimentación, transporte, salud, servicios, educación y el pago mínimo de deudas.',
    higherIsBetter: false,
  },
  wants: {
    label: 'Deseos',
    color: '#c084fc',
    desc: 'Estilo de vida y gustos: lo que disfrutas pero podrías recortar.',
    examples: 'Entretenimiento, ropa, suscripciones, restaurantes, regalos y mascotas.',
    higherIsBetter: false,
  },
  savings: {
    label: 'Ahorro y deuda',
    color: '#4ade80',
    desc: 'Lo que te queda para apartar al futuro o adelantar pago de deudas.',
    examples: 'Ahorro, fondo de emergencia, inversiones y abonos extra a deudas.',
    higherIsBetter: true,
  },
};

export interface RuleResult {
  income: number;
  needs: number;
  wants: number;
  savings: number; // sobrante = ingreso − necesidades − deseos (mín. 0)
}

/** Calcula los montos por bucket. `byCategory` son gastos (montos positivos) con su icono. */
export function computeRule(
  income: number,
  byCategory: Array<{ icon: string; amount: number }>,
): RuleResult {
  let needs = 0;
  let wants = 0;
  for (const c of byCategory) {
    const b = bucketOfIcon(c.icon);
    if (b === 'needs') needs += c.amount;
    else wants += c.amount; // savings no proviene de gastos
  }
  const savings = Math.max(income - needs - wants, 0);
  return { income, needs, wants, savings };
}
