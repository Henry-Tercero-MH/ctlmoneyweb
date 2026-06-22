import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Scale, Check, AlertTriangle } from 'lucide-react';
import { useTransactionSummary } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { formatMoney, money } from '@/core/money';
import { useUiStore } from '@/stores/uiStore';
import { Card } from '@/ui/components/Card';
import { EmptyState } from '@/ui/components/EmptyState';
import { computeRule, bucketOfIcon, RULE_TARGET, BUCKET_META, type Bucket } from '@/core/budgetRule';
import type { CurrencyCode } from '@/core/money';
import styles from './RuleScreen.module.css';

function shiftMonth(ym: string, delta: number): string {
  const parts = ym.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1 + delta;
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string): string {
  const parts = ym.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, 1).toLocaleString('es', {
    month: 'long',
    year: 'numeric',
  });
}

function isCurrentOrFuture(ym: string): boolean {
  const now = new Date();
  return ym >= `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const ORDER: Bucket[] = ['needs', 'wants', 'savings'];

export default function RuleScreen() {
  const currency = useUiStore((s) => s.activeCurrency) as CurrencyCode;
  const now = new Date();
  const [ym, setYm] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  const { data: summary } = useTransactionSummary(ym);
  const { data: categories = [] } = useCategories();

  const iconOf = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of categories) m[c.id] = c.icon || 'otros';
    return m;
  }, [categories]);

  const income = summary?.income_minor ?? 0;

  const result = useMemo(() => {
    const byCategory = (summary?.by_category ?? []).map((r) => ({
      icon: iconOf[r.category_id] ?? 'otros',
      amount: r.amount_minor,
    }));
    return computeRule(income, byCategory);
  }, [summary, iconOf, income]);

  // Categorías de gasto del usuario agrupadas por bucket (para describir qué va en cada una)
  const catsByBucket = useMemo(() => {
    const g: Record<Bucket, string[]> = { needs: [], wants: [], savings: [] };
    for (const c of categories) {
      if (c.kind !== 'expense') continue;
      g[bucketOfIcon(c.icon || 'otros')].push(c.name);
    }
    return g;
  }, [categories]);

  const amounts: Record<Bucket, number> = {
    needs: result.needs,
    wants: result.wants,
    savings: result.savings,
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Scale size={20} strokeWidth={2} style={{ verticalAlign: '-3px', marginRight: 8 }} />
          Regla 50 / 30 / 20
        </h1>
      </header>

      <div className={styles.monthNav}>
        <button className={styles.monthBtn} onClick={() => setYm(shiftMonth(ym, -1))} type="button" aria-label="Mes anterior">
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <span className={styles.monthLabel}>{monthLabel(ym)}</span>
        <button
          className={styles.monthBtn}
          onClick={() => setYm(shiftMonth(ym, 1))}
          type="button"
          aria-label="Mes siguiente"
          disabled={isCurrentOrFuture(ym)}
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      </div>

      <div className={styles.body}>
        {income <= 0 ? (
          <EmptyState
            title="Sin ingresos este mes"
            body="Registra tus ingresos del mes para comparar tu reparto contra la regla 50/30/20."
          />
        ) : (
          <>
            <Card className={styles.introCard}>
              <p className={styles.introLabel}>Ingresos del mes</p>
              <p className={styles.introAmount}>{formatMoney(money(income), currency)}</p>
              <p className={styles.introText}>
                La regla sugiere repartirlos: <strong>50%</strong> necesidades, <strong>30%</strong> deseos y{' '}
                <strong>20%</strong> ahorro/deuda.
              </p>
            </Card>

            {ORDER.map((bucket) => {
              const meta = BUCKET_META[bucket];
              const target = RULE_TARGET[bucket];
              const amount = amounts[bucket];
              const targetAmount = Math.round((income * target) / 100);
              const pct = income > 0 ? (amount / income) * 100 : 0;
              // Estado: en deseos/necesidades menos es mejor; en ahorro más es mejor.
              const good = meta.higherIsBetter ? pct >= target : pct <= target;
              const diff = amount - targetAmount;

              return (
                <Card key={bucket} className={styles.bucketCard} style={{ borderLeftColor: meta.color }}>
                  <div className={styles.bucketHead}>
                    <div className={styles.bucketTitleWrap}>
                      <span className={styles.bucketDot} style={{ background: meta.color }} />
                      <span className={styles.bucketLabel}>{meta.label}</span>
                      <span className={styles.bucketTarget}>{target}%</span>
                    </div>
                    <span
                      className={`${styles.statusChip} ${good ? styles.statusGood : styles.statusBad}`}
                    >
                      {good ? <Check size={13} strokeWidth={2.5} /> : <AlertTriangle size={13} strokeWidth={2.5} />}
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  <div className={styles.amounts}>
                    <span className={styles.amountActual}>{formatMoney(money(amount), currency)}</span>
                    <span className={styles.amountTarget}>
                      ideal {formatMoney(money(targetAmount), currency)}
                    </span>
                  </div>

                  {/* Barra: % del ingreso con la línea objetivo */}
                  <div className={styles.track}>
                    <div
                      className={styles.fill}
                      style={{ width: `${Math.min(pct, 100)}%`, background: good ? meta.color : 'var(--color-expense)' }}
                    />
                    <div className={styles.targetMark} style={{ left: `${Math.min(target, 100)}%` }} />
                  </div>

                  <p className={styles.statusText}>
                    {meta.higherIsBetter
                      ? good
                        ? `¡Bien! Estás ahorrando ${formatMoney(money(Math.abs(diff)), currency)} por encima de la meta.`
                        : `Te faltan ${formatMoney(money(Math.abs(diff)), currency)} para llegar al 20%.`
                      : good
                        ? `Dentro del objetivo, con ${formatMoney(money(Math.abs(diff)), currency)} de margen.`
                        : `Te excediste ${formatMoney(money(Math.abs(diff)), currency)} sobre el ${target}%.`}
                  </p>

                  <p className={styles.desc}>{meta.desc}</p>
                  <p className={styles.examples}>
                    <strong>Qué incluye:</strong> {meta.examples}
                  </p>

                  {bucket !== 'savings' && catsByBucket[bucket].length > 0 && (
                    <div className={styles.chips}>
                      {catsByBucket[bucket].map((name) => (
                        <span key={name} className={styles.chip}>{name}</span>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}

            <p className={styles.foot}>
              El ahorro se calcula como lo que te queda (ingresos − necesidades − deseos).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
