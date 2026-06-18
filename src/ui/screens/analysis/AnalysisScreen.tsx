import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus, CreditCard, AlertTriangle, CalendarClock, CheckCircle2 } from 'lucide-react';
import { useTransactionSummary, useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCards } from '@/hooks/useCreditCards';
import { computeCardCycle, type AlertLevel } from '@/core/creditCard';
import { formatMoney, money } from '@/core/money';
import { formatDayMonth, todayISO } from '@/core/dates';
import { useUiStore } from '@/stores/uiStore';
import { Skeleton } from '@/ui/components/Skeleton';
import { Card } from '@/ui/components/Card';
import { CategoryIcon } from '@/ui/components/CategoryIcon';
import { t } from '@/i18n/es';
import type { CurrencyCode } from '@/core/money';
import styles from './AnalysisScreen.module.css';

// ── Paleta de segmentos del donut ──────────────────────────────────────
const SEGMENT_COLORS = [
  '#f5c800', '#f87171', '#4ade80', '#60a5fa',
  '#c084fc', '#fb923c', '#34d399', '#f472b6',
  '#a78bfa', '#38bdf8',
];

const LEVEL_COLOR: Record<AlertLevel, string> = {
  ok: 'var(--color-income)',
  soon: 'var(--color-warning)',
  urgent: 'var(--color-expense)',
};

const LEVEL_ICON: Record<AlertLevel, typeof CheckCircle2> = {
  ok: CheckCircle2,
  soon: CalendarClock,
  urgent: AlertTriangle,
};

function prevMonth(ym: string): string {
  const parts = ym.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

function nextMonth(ym: string): string {
  const parts = ym.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string): string {
  const parts = ym.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  return new Date(y, m - 1, 1).toLocaleString('es', { month: 'long', year: 'numeric' });
}

function isCurrentOrFuture(ym: string): boolean {
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return ym >= cur;
}

// ── Donut SVG puro ─────────────────────────────────────────────────────
interface Slice { pct: number; color: string; label: string }
function DonutChart({ slices, total, currency }: { slices: Slice[]; total: number; currency: CurrencyCode }) {
  const R = 70;
  const STROKE = 14;
  const CX = 88;
  const CY = 88;
  const circumference = 2 * Math.PI * R;

  let offset = 0;
  const paths = slices.map((s, i) => {
    const dash = (s.pct / 100) * circumference;
    const gap = circumference - dash;
    const el = (
      <circle
        key={i}
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke={s.color}
        strokeWidth={STROKE}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${CX} ${CY})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    );
    offset += dash + 1; // pequeño gap entre segmentos
    return el;
  });

  return (
    <svg viewBox={`0 0 ${CX * 2} ${CY * 2}`} className={styles.donut} aria-hidden="true">
      {/* Track */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-border)" strokeWidth={STROKE} />
      {paths}
      {/* Centro */}
      <text x={CX} y={CY - 8} textAnchor="middle" className={styles.donutTotal}>
        {formatMoney(money(total), currency)}
      </text>
      <text x={CX} y={CY + 14} textAnchor="middle" className={styles.donutLabel}>
        {t.home.expense}
      </text>
    </svg>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────
export default function AnalysisScreen() {
  const currency = useUiStore((s) => s.activeCurrency) as CurrencyCode;
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [ym, setYm] = useState(currentYM);

  const { data: summary, isLoading } = useTransactionSummary(ym);
  const { data: categories = [] } = useCategories();

  // ── Tarjetas de crédito (estado "actual", independiente del mes elegido) ──
  const { data: cards = [] } = useCreditCards();
  const { data: txThisM = [] } = useTransactions(currentYM);
  const { data: txPrevM = [] } = useTransactions(prevMonth(currentYM));
  const cardTx = useMemo(() => [...txThisM, ...txPrevM], [txThisM, txPrevM]);

  function spentInCycle(accountId: string, cycleStart: string): number {
    if (!accountId) return 0;
    const today = todayISO();
    return cardTx
      .filter((t) => t.account_id === accountId && t.kind === 'expense' && t.date >= cycleStart && t.date <= today)
      .reduce((sum, t) => sum + t.amount_minor, 0);
  }

  // Mapa id→categoría
  const catMap = useMemo(() => {
    const m: Record<string, { name: string; icon: string; color: string }> = {};
    for (const c of categories) m[c.id] = { name: c.name, icon: c.icon ?? 'otros', color: c.color ?? '#8a8370' };
    return m;
  }, [categories]);

  // Segmentos ordenados de mayor a menor
  const slices = useMemo(() => {
    if (!summary) return [];
    const total = summary.expense_minor || 1;
    return [...(summary.by_category ?? [])]
      .sort((a, b) => b.amount_minor - a.amount_minor)
      .map((row, i) => ({
        category_id: row.category_id,
        amount_minor: row.amount_minor,
        pct: (row.amount_minor / total) * 100,
        color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] as string,
        label: catMap[row.category_id]?.name ?? '—',
        icon: catMap[row.category_id]?.icon ?? 'otros',
      }))
      .filter((s) => s.amount_minor > 0);
  }, [summary, catMap]);

  const net = (summary?.income_minor ?? 0) - (summary?.expense_minor ?? 0);
  const netPositive = net >= 0;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t.nav.analysis}</h1>
      </header>

      {/* ── Selector de mes ── */}
      <div className={styles.monthNav}>
        <button className={styles.monthBtn} onClick={() => setYm(prevMonth(ym))} type="button" aria-label="Mes anterior">
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <span className={styles.monthLabel}>{monthLabel(ym)}</span>
        <button
          className={styles.monthBtn}
          onClick={() => setYm(nextMonth(ym))}
          type="button"
          aria-label="Mes siguiente"
          disabled={isCurrentOrFuture(ym)}
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      </div>

      <div className={styles.body}>
        {isLoading ? (
          <div className={styles.skeletons}>
            <Skeleton width="100%" height="200px" radius="16px" />
            <Skeleton width="100%" height="160px" radius="16px" />
            <Skeleton width="100%" height="240px" radius="16px" />
          </div>
        ) : (
          <>
            {/* ── Resumen ingresos / gastos / neto ── */}
            <div className={styles.kpiRow}>
              <Card className={`${styles.kpiCard} ${styles.kpiIncome}`}>
                <TrendingUp size={16} strokeWidth={2} className={styles.kpiIcon} />
                <p className={styles.kpiValue}>
                  {formatMoney(money(summary?.income_minor ?? 0), currency)}
                </p>
                <p className={styles.kpiLabel}>{t.home.income}</p>
              </Card>
              <Card className={`${styles.kpiCard} ${styles.kpiExpense}`}>
                <TrendingDown size={16} strokeWidth={2} className={styles.kpiIcon} />
                <p className={styles.kpiValue}>
                  {formatMoney(money(summary?.expense_minor ?? 0), currency)}
                </p>
                <p className={styles.kpiLabel}>{t.home.expense}</p>
              </Card>
              <Card className={`${styles.kpiCard} ${netPositive ? styles.kpiNet : styles.kpiNetNeg}`}>
                <Minus size={16} strokeWidth={2} className={styles.kpiIcon} />
                <p className={styles.kpiValue}>
                  {netPositive ? '+' : ''}{formatMoney(money(Math.abs(net)), currency)}
                </p>
                <p className={styles.kpiLabel}>Neto</p>
              </Card>
            </div>

            {/* ── Estado de tarjetas de crédito ── */}
            {cards.length > 0 && (
              <Card className={styles.ccCard}>
                <p className={styles.sectionTitle}>
                  <CreditCard size={15} strokeWidth={2} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Tarjetas de crédito
                </p>
                <div className={styles.ccList}>
                  {cards.map((card) => {
                    const cycle = computeCardCycle(card);
                    const color = LEVEL_COLOR[cycle.level];
                    const Icon = LEVEL_ICON[cycle.level];
                    const spent = spentInCycle(card.linkedAccountId, cycle.cycleStart);
                    const hasLimit = card.linkedAccountId && card.limitMinor > 0;
                    const limitPct = hasLimit ? Math.min((spent / card.limitMinor) * 100, 100) : 0;

                    return (
                      <div key={card.id} className={styles.ccRow} style={{ borderLeftColor: color }}>
                        <div className={styles.ccHead}>
                          <div>
                            <p className={styles.ccName}>{card.name}</p>
                            <p className={styles.ccSub}>
                              Pago: {formatDayMonth(cycle.nextPayment)} · corte día {card.cutoffDay}
                            </p>
                          </div>
                          <span className={styles.ccBadge} style={{ color, borderColor: color }}>
                            <Icon size={13} strokeWidth={2} />
                            {cycle.daysUntilPayment === 0 ? 'Hoy' : `${cycle.daysUntilPayment}d`}
                          </span>
                        </div>

                        {card.linkedAccountId ? (
                          <>
                            <div className={styles.ccSpentRow}>
                              <span>Gastado este ciclo</span>
                              <span className={styles.ccSpent}>
                                {formatMoney(money(spent), currency)}
                                {hasLimit && <> / {formatMoney(money(card.limitMinor), currency)}</>}
                              </span>
                            </div>
                            {hasLimit && (
                              <div className={styles.ccTrack}>
                                <div
                                  className={styles.ccFill}
                                  style={{ width: `${limitPct}%`, background: limitPct >= 100 ? 'var(--color-expense)' : 'var(--color-primary)' }}
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <p className={styles.ccHint}>Vincula una cuenta a la tarjeta para ver el gasto del ciclo.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── Donut + leyenda ── */}
            {slices.length === 0 ? (
              <Card className={styles.emptyCard}>
                <p className={styles.emptyText}>{t.common.empty}</p>
              </Card>
            ) : (
              <Card className={styles.donutCard}>
                <p className={styles.sectionTitle}>Gastos por categoría</p>
                <div className={styles.donutRow}>
                  <DonutChart
                    slices={slices}
                    total={summary?.expense_minor ?? 0}
                    currency={currency}
                  />
                  <div className={styles.legend}>
                    {slices.slice(0, 6).map((s, i) => (
                      <div key={i} className={styles.legendRow}>
                        <span className={styles.legendDot} style={{ background: s.color }} />
                        <span className={styles.legendIcon}><CategoryIcon slug={s.icon} size={14} /></span>
                        <span className={styles.legendName}>{s.label}</span>
                        <span className={styles.legendPct}>{s.pct.toFixed(0)}%</span>
                      </div>
                    ))}
                    {slices.length > 6 && (
                      <p className={styles.legendMore}>+{slices.length - 6} más</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* ── Barras por categoría ── */}
            {slices.length > 0 && (
              <Card className={styles.barsCard}>
                <p className={styles.sectionTitle}>Detalle por categoría</p>
                <div className={styles.barsList}>
                  {slices.map((s, i) => (
                    <div key={i} className={styles.barRow}>
                      <div className={styles.barMeta}>
                        <span className={styles.barIcon}><CategoryIcon slug={s.icon} size={15} /></span>
                        <span className={styles.barName}>{s.label}</span>
                        <span className={styles.barAmount}>
                          {formatMoney(money(s.amount_minor), currency)}
                        </span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${s.pct}%`, background: s.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Gráfica diaria (barras simples) ── */}
            {(summary?.daily?.length ?? 0) > 0 && (
              <Card className={styles.dailyCard}>
                <p className={styles.sectionTitle}>Gasto diario</p>
                <DailyBars daily={summary!.daily} currency={currency} />
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Barras diarias ─────────────────────────────────────────────────────
interface DailyPoint { date: string; expense_minor: number; income_minor: number }
function DailyBars({ daily, currency }: { daily: DailyPoint[]; currency: CurrencyCode }) {
  const max = Math.max(...daily.map((d) => d.expense_minor), 1);
  // Mostrar solo los últimos 15 días si hay más
  const visible = daily.length > 15 ? daily.slice(-15) : daily;

  return (
    <div className={styles.dailyGrid}>
      {visible.map((d, i) => {
        const pct = (d.expense_minor / max) * 100;
        const day = String(new Date(d.date + 'T00:00:00').getDate());
        return (
          <div key={i} className={styles.dailyCol} title={`${d.date}: ${formatMoney(money(d.expense_minor), currency)}`}>
            <div className={styles.dailyBarWrap}>
              <div className={styles.dailyBar} style={{ height: `${Math.max(pct, 4)}%` }} />
            </div>
            <span className={styles.dailyDay}>{day}</span>
          </div>
        );
      })}
    </div>
  );
}
