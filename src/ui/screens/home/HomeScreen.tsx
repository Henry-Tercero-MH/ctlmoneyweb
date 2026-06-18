import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { useTransactions, useTransactionSummary } from '@/hooks/useTransactions';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { currentYearMonth, formatMonthLabel, formatDayMonth } from '@/core/dates';
import { formatMoney, money } from '@/core/money';
import { Card } from '@/ui/components/Card';
import { Skeleton, SkeletonLines } from '@/ui/components/Skeleton';
import { EmptyState } from '@/ui/components/EmptyState';
import { Button } from '@/ui/components/Button';
import { palette } from '@/ui/theme/tokens';
import { t } from '@/i18n/es';
import type { CurrencyCode } from '@/core/money';
import styles from './HomeScreen.module.css';

export default function HomeScreen() {
  const yearMonth = currentYearMonth();
  const currency = useUiStore((s) => s.activeCurrency) as CurrencyCode;
  const openRegister = useUiStore((s) => s.openRegister);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  const { data: summary, isLoading: loadingSummary } = useTransactionSummary(yearMonth);
  const { data: transactions, isLoading: loadingTx } = useTransactions(yearMonth);

  const recent = transactions?.slice(0, 5) ?? [];
  const netMinor = summary?.net_minor ?? 0;
  const incomeMinor = summary?.income_minor ?? 0;
  const expenseMinor = summary?.expense_minor ?? 0;
  const isPositive = netMinor >= 0;

  // Prepara datos para la gráfica de barras diaria (últimos 30 puntos)
  const dailyData = (summary?.daily ?? []).slice(-30).map((d) => ({
    date: formatDayMonth(d.date),
    value: d.expense_minor / 100,
  }));

  return (
    <div className={styles.screen}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <p className={styles.greeting}>
          {profile ? `Hola, ${profile.name.split(' ')[0]}` : t.appName}
        </p>
        <p className={styles.monthLabel}>{formatMonthLabel(yearMonth)}</p>
      </header>

      {/* ── Cifra protagonista ── */}
      <section className={styles.heroSection}>
        {loadingSummary ? (
          <div className={styles.heroSkeleton}>
            <Skeleton width="160px" height="14px" />
            <Skeleton width="240px" height="48px" radius="8px" />
            <div className={styles.heroSubRow}>
              <Skeleton width="100px" height="32px" radius="8px" />
              <Skeleton width="100px" height="32px" radius="8px" />
            </div>
          </div>
        ) : (
          <Card className={styles.heroCard}>
            <p className={styles.heroLabel}>{t.home.netThisMonth}</p>
            <p className={`${styles.heroAmount} ${isPositive ? styles.positive : styles.negative}`}>
              {formatMoney(money(netMinor), currency)}
            </p>
            <div className={styles.summaryRow}>
              <div className={styles.summaryItem}>
                <ArrowUpRight size={16} strokeWidth={2} className={styles.incomeIcon} />
                <span className={styles.summaryLabel}>{t.home.income}</span>
                <span className={`${styles.summaryAmount} ${styles.incomeText}`}>
                  {formatMoney(money(incomeMinor), currency)}
                </span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryItem}>
                <ArrowDownRight size={16} strokeWidth={2} className={styles.expenseIcon} />
                <span className={styles.summaryLabel}>{t.home.expense}</span>
                <span className={`${styles.summaryAmount} ${styles.expenseText}`}>
                  {formatMoney(money(expenseMinor), currency)}
                </span>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* ── Gráfica de gasto diario ── */}
      {!loadingSummary && dailyData.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t.home.dailySpend}</h2>
          <Card className={styles.chartCard}>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={dailyData} barSize={6} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--color-text-disabled)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {dailyData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === dailyData.length - 1 ? palette.mustard : palette.mustardBright + '55'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>
      )}

      {/* ── Últimos movimientos ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.home.recent}</h2>
          {(transactions?.length ?? 0) > 0 && (
            <button
              className={styles.seeAllBtn}
              onClick={() => navigate('/movimientos')}
              type="button"
            >
              {t.home.seeAll}
              <ChevronRight size={14} strokeWidth={2} />
            </button>
          )}
        </div>

        {loadingTx ? (
          <Card>
            <SkeletonLines count={4} />
          </Card>
        ) : recent.length === 0 ? (
          <EmptyState
            title={t.home.emptyTitle}
            action={
              <Button variant="secondary" onClick={openRegister}>
                {t.home.emptyAction}
              </Button>
            }
          />
        ) : (
          <Card className={styles.txList}>
            {recent.map((tx, i) => (
              <div key={tx.id} className={`${styles.txRow} ${i < recent.length - 1 ? styles.txBorder : ''}`}>
                <div className={styles.txInfo}>
                  <span className={styles.txNote}>{tx.note || '—'}</span>
                  <span className={styles.txDate}>{tx.date}</span>
                </div>
                <span
                  className={`${styles.txAmount} tabular ${
                    tx.kind === 'income' ? styles.incomeText : styles.expenseText
                  }`}
                >
                  {tx.kind === 'income' ? '+' : '−'}
                  {formatMoney(money(tx.amount_minor), currency)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
