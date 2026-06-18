/** creditCard.ts — modelo y cálculo del ciclo de corte/pago de una tarjeta. */
import { differenceInCalendarDays, addDays, format } from 'date-fns';

export interface CreditCard {
  id: string;
  name: string;
  /** Día del mes en que cierra el estado de cuenta (1-31). */
  cutoffDay: number;
  /** Día del mes en que vence el pago (1-31). */
  paymentDay: number;
  /** Límite de crédito en unidades menores. 0 = sin límite. */
  limitMinor: number;
  currency: string;
}

export type AlertLevel = 'ok' | 'soon' | 'urgent';

export interface CardCycle {
  /** Inicio del ciclo de compras abierto (día siguiente al último corte). */
  cycleStart: string;
  /** Fin del ciclo de compras abierto (próximo corte). */
  cycleEnd: string;
  /** Cuándo se paga lo que compres dentro del ciclo abierto. */
  currentCyclePayment: string;
  /** Próximo corte. */
  nextCutoff: string;
  daysUntilCutoff: number;
  /** Próximo pago a realizar (el del estado de cuenta ya cerrado). */
  nextPayment: string;
  daysUntilPayment: number;
  /** Nivel de alerta según la cercanía del próximo pago. */
  level: AlertLevel;
}

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Fecha del día `day` en el mes dado, recortada al último día si el mes es más corto. */
function dayOf(year: number, month0: number, day: number): Date {
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  return new Date(year, month0, Math.min(day, lastDay));
}

/** Última ocurrencia de `day` en o antes de hoy. */
function lastOnOrBefore(today: Date, day: number): Date {
  const cur = dayOf(today.getFullYear(), today.getMonth(), day);
  if (differenceInCalendarDays(cur, today) <= 0) return cur;
  return dayOf(today.getFullYear(), today.getMonth() - 1, day);
}

/** Primera ocurrencia de `day` estrictamente después de hoy. */
function firstAfter(today: Date, day: number): Date {
  const cur = dayOf(today.getFullYear(), today.getMonth(), day);
  if (differenceInCalendarDays(cur, today) > 0) return cur;
  return dayOf(today.getFullYear(), today.getMonth() + 1, day);
}

/** Primera ocurrencia de `day` en o después de hoy. */
function firstOnOrAfter(today: Date, day: number): Date {
  const cur = dayOf(today.getFullYear(), today.getMonth(), day);
  if (differenceInCalendarDays(cur, today) >= 0) return cur;
  return dayOf(today.getFullYear(), today.getMonth() + 1, day);
}

export function alertLevel(daysUntilPayment: number): AlertLevel {
  if (daysUntilPayment <= 3) return 'urgent';
  if (daysUntilPayment <= 7) return 'soon';
  return 'ok';
}

/** Calcula el ciclo de corte/pago de una tarjeta respecto a `today`. */
export function computeCardCycle(card: CreditCard, today: Date = new Date()): CardCycle {
  const lastCutoff = lastOnOrBefore(today, card.cutoffDay);
  const nextCutoff = firstAfter(today, card.cutoffDay);
  const cycleStart = addDays(lastCutoff, 1);

  // Lo que compras ahora se factura en el próximo corte y se paga en el
  // primer día de pago posterior a ese corte.
  const currentCyclePayment = firstAfter(nextCutoff, card.paymentDay);

  const nextPayment = firstOnOrAfter(today, card.paymentDay);
  const daysUntilCutoff = differenceInCalendarDays(nextCutoff, today);
  const daysUntilPayment = differenceInCalendarDays(nextPayment, today);

  return {
    cycleStart: iso(cycleStart),
    cycleEnd: iso(nextCutoff),
    currentCyclePayment: iso(currentCyclePayment),
    nextCutoff: iso(nextCutoff),
    daysUntilCutoff,
    nextPayment: iso(nextPayment),
    daysUntilPayment,
    level: alertLevel(daysUntilPayment),
  };
}
