import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { Plus, Trash2, Pencil, Target } from 'lucide-react';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoals';
import { useAccounts, useAccountBalances } from '@/hooks/useAccounts';
import { formatMoney, money, parseMoney } from '@/core/money';
import { useUiStore } from '@/stores/uiStore';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { Skeleton } from '@/ui/components/Skeleton';
import { EmptyState } from '@/ui/components/EmptyState';
import { t } from '@/i18n/es';
import type { CurrencyCode } from '@/core/money';
import type { GoalDTO } from '@/api/types';
import type { UpsertGoalPayload } from '@/api/endpoints/goals';
import styles from './GoalsScreen.module.css';

type GoalForm = {
  id: string;
  name: string;
  target: string;
  target_date: string;
  linked_account_id: string;
};

const BLANK: GoalForm = { id: '', name: '', target: '', target_date: '', linked_account_id: '' };

function daysLeft(dateStr: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function progressPct(saved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min((saved / target) * 100, 100);
}

export default function GoalsScreen() {
  const currency = useUiStore((s) => s.activeCurrency) as CurrencyCode;

  const { data: goals = [], isLoading } = useGoals();
  const { data: accounts = [] } = useAccounts();
  const { data: balances = [] } = useAccountBalances();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<GoalForm>(BLANK);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // mapa account_id → balance actual
  const balanceMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of balances) m[b.account_id] = b.balance_minor;
    return m;
  }, [balances]);

  function openNew() {
    setForm({ ...BLANK, id: uuid() });
    setSheetOpen(true);
  }

  function openEdit(g: GoalDTO) {
    setForm({
      id: g.id,
      name: g.name,
      target: String(g.target_minor / 100),
      target_date: g.target_date ?? '',
      linked_account_id: g.linked_account_id ?? '',
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    const targetMinor = parseMoney(form.target || '0', currency);
    if (!form.name.trim() || targetMinor <= 0) return;
    const payload: UpsertGoalPayload = {
      id: form.id,
      name: form.name.trim(),
      target_minor: targetMinor,
      target_date: form.target_date || '',
      linked_account_id: form.linked_account_id || '',
    };
    const isEdit = goals.some((g) => g.id === payload.id);
    setSheetOpen(false);
    setForm(BLANK);
    if (isEdit) await updateGoal.mutateAsync(payload);
    else await createGoal.mutateAsync(payload);
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t.goals.title}</h1>
        <button className={styles.addBtn} onClick={openNew} type="button" aria-label={t.goals.new}>
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </header>

      <div className={styles.body}>
        {isLoading ? (
          <div className={styles.skeletons}>
            {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height="140px" radius="16px" />)}
          </div>
        ) : goals.length === 0 ? (
          <EmptyState
            title={t.goals.emptyTitle}
            body={t.goals.emptyBody}
            action={<Button onClick={openNew}>{t.goals.new}</Button>}
          />
        ) : (
          goals.map((goal) => {
            const saved = goal.linked_account_id
              ? (balanceMap[goal.linked_account_id] ?? 0)
              : 0;
            const pct = progressPct(saved, goal.target_minor);
            const over = saved >= goal.target_minor;
            const days = daysLeft(goal.target_date);
            const overdue = days !== null && days < 0;
            const acc = accounts.find((a) => a.id === goal.linked_account_id);

            return (
              <Card key={goal.id} className={`${styles.goalCard} ${over ? styles.goalDone : ''}`}>
                {/* Top row */}
                <div className={styles.topRow}>
                  <div className={styles.goalIcon}>
                    <Target size={20} strokeWidth={1.75} />
                  </div>
                  <div className={styles.goalInfo}>
                    <p className={styles.goalName}>{goal.name}</p>
                    {acc && <p className={styles.goalAccount}>{acc.name}</p>}
                  </div>
                  <div className={styles.topActions}>
                    <button className={styles.iconBtn} onClick={() => openEdit(goal)} type="button" aria-label={t.common.edit}>
                      <Pencil size={13} strokeWidth={2} />
                    </button>
                    <button className={`${styles.iconBtn} ${styles.deleteBtn}`}
                      onClick={() => setConfirmDelete(goal.id)} type="button" aria-label={t.common.delete}>
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Montos */}
                <div className={styles.amountRow}>
                  <span className={styles.savedAmount}>
                    {formatMoney(money(saved), currency)}
                  </span>
                  <span className={styles.targetAmount}>
                    {t.goals.of} {formatMoney(money(goal.target_minor), currency)}
                  </span>
                </div>

                {/* Barra */}
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${over ? styles.barDone : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Footer */}
                <div className={styles.footerRow}>
                  {over ? (
                    <span className={styles.achievedLabel}>🎉 {t.goals.achieved}</span>
                  ) : (
                    <span className={styles.remainingLabel}>
                      {formatMoney(money(goal.target_minor - saved), currency)} {t.goals.remaining}
                    </span>
                  )}
                  {days !== null && !over && (
                    <span className={`${styles.daysLabel} ${overdue ? styles.overdue : ''}`}>
                      {overdue
                        ? t.goals.overdue
                        : `${days} ${t.goals.daysLeft}`}
                    </span>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ══ Sheet — Nueva/Editar meta ══ */}
      <BottomSheet
        open={sheetOpen}
        title={goals.some((g) => g.id === form.id) ? t.goals.edit : t.goals.new}
        onClose={() => { setSheetOpen(false); setForm(BLANK); }}
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t.goals.name}</label>
            <input className={styles.input} type="text" maxLength={50}
              placeholder="Ej: Viaje a Europa"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t.goals.target}</label>
            <input className={styles.input} type="number" inputMode="decimal"
              placeholder="0.00" min="0"
              value={form.target}
              onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t.goals.targetDate}</label>
              <input className={styles.input} type="date"
                value={form.target_date}
                onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t.goals.linkedAccount}</label>
              <select className={styles.select}
                value={form.linked_account_id}
                onChange={(e) => setForm((f) => ({ ...f, linked_account_id: e.target.value }))}>
                <option value="">{t.goals.noAccount}</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <Button block onClick={handleSave}
            disabled={!form.name.trim() || !form.target || createGoal.isPending || updateGoal.isPending}>
            {t.common.save}
          </Button>
        </div>
      </BottomSheet>

      {/* ══ Confirmar borrado ══ */}
      {confirmDelete && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.confirmSheet}>
            <p className={styles.confirmText}>{t.goals.deleteConfirm}</p>
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t.common.cancel}</Button>
              <Button variant="danger" onClick={() => { deleteGoal.mutate(confirmDelete); setConfirmDelete(null); }}>
                {t.common.delete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
