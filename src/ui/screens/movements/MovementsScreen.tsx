import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions';
import { useUiStore } from '@/stores/uiStore';
import { currentYearMonth, formatDate } from '@/core/dates';
import { formatMoney, money } from '@/core/money';
import { Card } from '@/ui/components/Card';
import { Skeleton } from '@/ui/components/Skeleton';
import { EmptyState } from '@/ui/components/EmptyState';
import { Button } from '@/ui/components/Button';
import { t } from '@/i18n/es';
import type { TransactionDTO } from '@/api/types';
import type { CurrencyCode } from '@/core/money';
import styles from './MovementsScreen.module.css';

type DayGroup = { date: string; label: string; items: TransactionDTO[] };

function groupByDay(txs: TransactionDTO[]): DayGroup[] {
  const map = new Map<string, TransactionDTO[]>();
  for (const tx of txs) {
    const list = map.get(tx.date) ?? [];
    list.push(tx);
    map.set(tx.date, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, label: formatDate(date), items }));
}

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

export default function MovementsScreen() {
  const currency = useUiStore((s) => s.activeCurrency) as CurrencyCode;
  const openRegister = useUiStore((s) => s.openRegister);
  const openEdit = useUiStore((s) => s.openEditTransaction);
  const [ym, setYm] = useState(currentYearMonth());
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: transactions = [], isLoading } = useTransactions(ym, search);
  const deleteTx = useDeleteTransaction(ym);

  const groups = useMemo(() => groupByDay(transactions), [transactions]);

  function handleDelete(id: string) {
    setConfirmDelete(null);
    deleteTx.mutate(id);
  }

  return (
    <div className={styles.screen}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <h1 className={styles.title}>{t.movements.title}</h1>
        <div className={styles.searchWrap}>
          <Search size={16} strokeWidth={2} className={styles.searchIcon} aria-hidden />
          <input
            type="search"
            className={styles.searchInput}
            placeholder={t.movements.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t.movements.search}
          />
        </div>
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

      {/* ── Lista ── */}
      <div className={styles.body}>
        {isLoading ? (
          <div className={styles.skeletonList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width="100%" height="64px" radius="14px" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            title={t.movements.emptyTitle}
            action={
              <Button variant="secondary" onClick={openRegister}>
                {t.home.emptyAction}
              </Button>
            }
          />
        ) : (
          groups.map((group) => {
            const dayTotal = group.items.reduce((sum, tx) => {
              // Las transferencias son neutras (mueven dinero entre cuentas propias).
              if (tx.kind === 'transfer') return sum;
              return sum + (tx.kind === 'income' ? tx.amount_minor : -tx.amount_minor);
            }, 0);

            return (
              <div key={group.date} className={styles.group}>
                <div className={styles.dayHeader}>
                  <span className={styles.dayLabel}>{group.label}</span>
                  <span
                    className={`${styles.dayTotal} tabular ${dayTotal >= 0 ? styles.positive : styles.negative}`}
                  >
                    {dayTotal >= 0 ? '+' : '−'}
                    {formatMoney(money(Math.abs(dayTotal)), currency)}
                  </span>
                </div>

                <Card className={styles.txCard}>
                  {group.items.map((tx, i) => (
                    <div
                      key={tx.id}
                      className={`${styles.txRow} ${i < group.items.length - 1 ? styles.txBorder : ''}`}
                    >
                      <div className={styles.txInfo}>
                        <span className={styles.txNote}>{tx.note || '—'}</span>
                        <span className={styles.txKind}>
                          {tx.kind === 'income' ? t.register.income
                            : tx.kind === 'transfer' ? t.register.transfer
                            : t.register.expense}
                        </span>
                      </div>
                      <div className={styles.txRight}>
                        <span
                          className={`${styles.txAmount} tabular ${
                            tx.kind === 'income' ? styles.incomeText : styles.expenseText
                          }`}
                        >
                          {tx.kind === 'income' ? '+' : '−'}
                          {formatMoney(money(tx.amount_minor), currency)}
                        </span>
                        <div className={styles.txActions}>
                          <button
                            className={styles.actionBtn}
                            onClick={() => openEdit(tx)}
                            aria-label={t.movements.edit}
                            type="button"
                          >
                            <Pencil size={14} strokeWidth={1.75} />
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.actionDelete}`}
                            onClick={() => setConfirmDelete(tx.id)}
                            aria-label={t.movements.delete}
                            type="button"
                          >
                            <Trash2 size={14} strokeWidth={1.75} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            );
          })
        )}
      </div>

      {/* ── Confirm delete ── */}
      {confirmDelete &&
        createPortal(
          <div
            className={styles.overlay}
            role="dialog"
            aria-modal="true"
            aria-label={t.movements.deleteConfirm}
            onClick={() => setConfirmDelete(null)}
          >
            <div className={styles.confirmSheet} onClick={(e) => e.stopPropagation()}>
              <p className={styles.confirmText}>{t.movements.deleteConfirm}</p>
              <div className={styles.confirmActions}>
                <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                  {t.movements.cancel}
                </Button>
                <Button variant="danger" onClick={() => handleDelete(confirmDelete)}>
                  {t.movements.delete}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
