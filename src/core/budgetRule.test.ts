import { describe, it, expect } from 'vitest';
import { computeRule, bucketOfIcon } from './budgetRule';

describe('bucketOfIcon', () => {
  it('clasifica necesidades, deseos y desconocidas', () => {
    expect(bucketOfIcon('vivienda')).toBe('needs');
    expect(bucketOfIcon('deudas')).toBe('needs');
    expect(bucketOfIcon('entretenimiento')).toBe('wants');
    expect(bucketOfIcon('categoria-rara')).toBe('wants'); // default
  });
});

describe('computeRule', () => {
  it('reparte gastos por bucket y calcula sobrante', () => {
    const r = computeRule(10000, [
      { icon: 'vivienda', amount: 4000 },
      { icon: 'alimentacion', amount: 1000 },
      { icon: 'entretenimiento', amount: 2000 },
    ]);
    expect(r.needs).toBe(5000);
    expect(r.wants).toBe(2000);
    expect(r.savings).toBe(3000); // 10000 - 5000 - 2000
  });

  it('el sobrante nunca es negativo', () => {
    const r = computeRule(1000, [{ icon: 'vivienda', amount: 1500 }]);
    expect(r.savings).toBe(0);
  });
});
