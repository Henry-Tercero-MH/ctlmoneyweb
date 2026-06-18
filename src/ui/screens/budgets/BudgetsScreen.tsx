import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import { useBudgets, useCreateBudget, useDeleteBudget } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { currentYearMonth } from '@/core/dates';
import { formatMoney, money, parseMoney } from '@/core/money';
import { useUiStore } from '@/stores/uiStore';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { Skeleton } from '@/ui/components/Skeleton';
import { EmptyState } from '@/ui/components/EmptyState';
import { CategoryIcon } from '@/ui/components/CategoryIcon';
import { t } from '@/i18n/es';
import type { BudgetPeriod, CreateBudgetPayload } from '@/api/types';
import type { CurrencyCode } from '@/core/money';
import styles from './BudgetsScreen.module.css';

export default function BudgetsScreen() {
  const currency = useUiStore((s) => s.activeCurrency) as CurrencyCode;
  const ym = currentYearMonth();

  const { data: budgets = [], isLoading: loadingBudgets } = useBudgets();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions(ym);
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [categoryId, setCategoryId] = useState('');
  const [rawLimit, setRawLimit] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');

  const expenseCategories = categories.filter((c) => c.kind === 'expense');

  // Calcular gasto actual por categoría este mes
  const spentByCategory: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.kind === 'expense') {
      spentByCategory[tx.category_id] = (spentByCategory[tx.category_id] ?? 0) + tx.amount_minor;
    }
  }

  function resetForm() {
    setCategoryId('');
    setRawLimit('');
    setPeriod('monthly');
  }

  async function handleSave() {
    const limitMinor = parseMoney(rawLimit, currency);
    if (!categoryId || limitMinor <= 0) return;
    const payload: CreateBudgetPayload = {
      id: uuid(),
      category_id: categoryId,
      period,
      limit_minor: limitMinor,
      start_month: ym,
    };
    setSheetOpen(false);
    resetForm();
    await createBudget.mutateAsync(payload);
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t.budgets.title}</h1>
        <button className={styles.addBtn} onClick={() => setSheetOpen(true)} type="button" aria-label={t.budgets.new}>
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </header>

      <div className={styles.body}>
        {loadingBudgets ? (
          <div className={styles.skeletonList}>
            {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height="96px" radius="16px" />)}
          </div>
        ) : budgets.length === 0 ? (
          <EmptyState
            title={t.budgets.emptyTitle}
            body={t.budgets.emptyBody}
            action={<Button onClick={() => setSheetOpen(true)}>{t.budgets.new}</Button>}
          />
        ) : (
          budgets.map((budget) => {
            const cat = categories.find((c) => c.id === budget.category_id);
            const spent = spentByCategory[budget.category_id] ?? 0;
            const pct = Math.min((spent / budget.limit_minor) * 100, 100);
            const over = spent > budget.limit_minor;
            const remaining = budget.limit_minor - spent;

            return (
              <Card key={budget.id} className={styles.budgetCard}>
                <div className={styles.budgetTop}>
                  <div className={styles.budgetMeta}>
                    <span className={styles.catIcon}><CategoryIcon slug={cat?.icon ?? 'otros'} size={18} /></span>
                    <div>
                      <p className={styles.catName}>{cat?.name ?? '—'}</p>
                      <p className={styles.period}>
                        {budget.period === 'monthly' ? t.budgets.monthly : t.budgets.weekly}
                      </p>
                    </div>
                  </div>
                  <div className={styles.budgetAmounts}>
                    <span className={styles.spent}>
                      {formatMoney(money(spent), currency)}
                    </span>
                    <span className={styles.limit}>
                      {t.common.of} {formatMoney(money(budget.limit_minor), currency)}
                    </span>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${over ? styles.barOver : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className={styles.budgetBottom}>
                  <span className={`${styles.remainingLabel} ${over ? styles.overLabel : ''}`}>
                    {over
                      ? `${formatMoney(money(Math.abs(remaining)), currency)} ${t.budgets.over}`
                      : `${formatMoney(money(remaining), currency)} ${t.budgets.remaining}`}
                  </span>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setConfirmDelete(budget.id)}
                    type="button"
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Sheet nuevo presupuesto ── */}
      <BottomSheet open={sheetOpen} title={t.budgets.new} onClose={() => { setSheetOpen(false); resetForm(); }}>
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t.budgets.category}</label>
            <select
              className={styles.select}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{t.budgets.selectCategory}</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t.budgets.limit}</label>
            <input
              type="number"
              inputMode="decimal"
              className={styles.input}
              placeholder="0.00"
              value={rawLimit}
              onChange={(e) => setRawLimit(e.target.value)}
              min="0"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t.budgets.period}</label>
            <div className={styles.periodRow}>
              {(['monthly', 'weekly'] as BudgetPeriod[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`${styles.periodBtn} ${period === p ? styles.periodActive : ''}`}
                  onClick={() => setPeriod(p)}
                >
                  {p === 'monthly' ? t.budgets.monthly : t.budgets.weekly}
                </button>
              ))}
            </div>
          </div>

          <Button
            block
            onClick={handleSave}
            disabled={!categoryId || !rawLimit || createBudget.isPending}
          >
            {createBudget.isPending ? '…' : t.common.save}
          </Button>
        </div>
      </BottomSheet>

      {/* ── Confirmar borrado ── */}
      {confirmDelete && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.confirmSheet}>
            <p className={styles.confirmText}>{t.budgets.deleteConfirm}</p>
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t.common.cancel}</Button>
              <Button variant="danger" onClick={() => { deleteBudget.mutate(confirmDelete); setConfirmDelete(null); }}>
                {t.common.delete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Silencia el warning de import no usado
void ChevronRight;
