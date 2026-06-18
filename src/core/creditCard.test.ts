import { describe, it, expect } from 'vitest';
import { computeCardCycle, alertLevel, type CreditCard } from './creditCard';

const card: CreditCard = {
  id: '1',
  name: 'Visa',
  cutoffDay: 8,
  paymentDay: 2,
  limitMinor: 0,
  currency: 'GTQ',
};

describe('computeCardCycle', () => {
  it('calcula el ciclo de compras abierto y el pago del gasto actual', () => {
    const c = computeCardCycle(card, new Date(2026, 0, 15)); // 15 ene 2026
    expect(c.cycleStart).toBe('2026-01-09'); // día siguiente al corte del 8
    expect(c.cycleEnd).toBe('2026-02-08'); // próximo corte
    expect(c.currentCyclePayment).toBe('2026-03-02'); // lo que gastas ahora se paga el 2 mar
    expect(c.nextPayment).toBe('2026-02-02'); // pago más próximo
    expect(c.daysUntilPayment).toBe(18);
    expect(c.level).toBe('ok');
  });

  it('marca urgente cuando faltan ≤3 días para el pago', () => {
    const c = computeCardCycle(card, new Date(2026, 0, 31)); // 31 ene → pago 2 feb
    expect(c.nextPayment).toBe('2026-02-02');
    expect(c.daysUntilPayment).toBe(2);
    expect(c.level).toBe('urgent');
  });

  it('justo después del corte abre un ciclo nuevo', () => {
    const c = computeCardCycle(card, new Date(2026, 0, 9)); // 9 ene
    expect(c.cycleStart).toBe('2026-01-09');
    expect(c.cycleEnd).toBe('2026-02-08');
  });
});

describe('alertLevel', () => {
  it('clasifica por días restantes', () => {
    expect(alertLevel(0)).toBe('urgent');
    expect(alertLevel(3)).toBe('urgent');
    expect(alertLevel(5)).toBe('soon');
    expect(alertLevel(7)).toBe('soon');
    expect(alertLevel(8)).toBe('ok');
    expect(alertLevel(30)).toBe('ok');
  });
});
