import { describe, it, expect } from 'vitest';
import {
  money,
  add,
  subtract,
  multiply,
  percentOf,
  sum,
  formatMoney,
  parseMoney,
  roundHalfEven,
} from './money';

describe('money', () => {
  it('suma dos valores', () => {
    expect(add(money(125050), money(4950))).toBe(130000);
  });

  it('resta con resultado negativo', () => {
    expect(subtract(money(1000), money(2500))).toBe(-1500);
  });

  it('multiplica con redondeo bancario', () => {
    // 12345 * 0.1 = 1234.5 → par más cercano = 1234
    expect(multiply(money(12345), 0.1)).toBe(1234);
    // 12355 * 0.1 = 1235.5 → par más cercano = 1236
    expect(multiply(money(12355), 0.1)).toBe(1236);
  });

  it('roundHalfEven aplica regla del par', () => {
    expect(roundHalfEven(2.5)).toBe(2);
    expect(roundHalfEven(3.5)).toBe(4);
    expect(roundHalfEven(2.4)).toBe(2);
    expect(roundHalfEven(2.6)).toBe(3);
  });

  it('percentOf calcula porcentajes', () => {
    expect(percentOf(money(10000), 15)).toBe(1500);
  });

  it('sum agrega una lista', () => {
    expect(sum([money(100), money(200), money(300)])).toBe(600);
  });

  it('redondea no enteros al entero más cercano', () => {
    expect(money(10.5)).toBe(11);
    expect(money(10.4)).toBe(10);
  });

  it('formatea en GTQ', () => {
    const out = formatMoney(money(125050), 'GTQ');
    expect(out).toMatch(/1[.,]250[.,]50/);
    expect(out).toContain('Q');
  });

  it('formatea en USD', () => {
    expect(formatMoney(money(125050), 'USD')).toBe('$1,250.50');
  });

  it('parsea string con coma como separador de miles', () => {
    expect(parseMoney('1,250.50', 'USD')).toBe(125050);
  });

  it('parsea string con formato europeo (punto miles, coma decimal)', () => {
    expect(parseMoney('1.250,50', 'EUR')).toBe(125050);
  });

  it('parsea enteros sin decimales', () => {
    expect(parseMoney('99', 'GTQ')).toBe(9900);
  });

  it('parsea vacío como cero', () => {
    expect(parseMoney('', 'GTQ')).toBe(0);
  });

  it('parsea negativos', () => {
    expect(parseMoney('-50.25', 'GTQ')).toBe(-5025);
  });
});
