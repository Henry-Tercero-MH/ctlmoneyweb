import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Plus, Trash2, Pause, Play } from 'lucide-react';
import { useRecurringRules, useCreateRecurring, useUpdateRecurring, useDeleteRecurring } from '@/hooks/useRecurring';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { formatMoney, money, parseMoney } from '@/core/money';
import { useUiStore } from '@/stores/uiStore';
import { Card } from '@/ui/components/Card';
import { Button } from '@/ui/components/Button';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { Skeleton } from '@/ui/components/Skeleton';
import { EmptyState } from '@/ui/components/EmptyState';
import { CategoryIcon } from '@/ui/components/CategoryIcon';
import { t } from '@/i18n/es';
import type { RecurringFrequency, TransactionKind, CreateRecurringPayload, UpdateRecurringPayload } from '@/api/types';
import type { CurrencyCode } from '@/core/money';
import styles from './RecurringScreen.module.css';

const FREQUENCIES: RecurringFrequency[] = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];

const FREQ_LABEL: Record<RecurringFrequency, string> = {
  daily: t.recurring.daily,
  weekly: t.recurring.weekly,
  biweekly: t.recurring.biweekly,
  monthly: t.recurring.monthly,
  yearly: t.recurring.yearly,
};

export default function RecurringScreen() {
  const currency = useUiStore((s) => s.activeCurrency) as CurrencyCode;

  const { data: rules = [], isLoading } = useRecurringRules();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const createRule = useCreateRecurring();
  const updateRule = useUpdateRecurring();
  const deleteRule = useDeleteRecurring();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [nextRunDate, setNextRunDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');

  const filteredCategories = categories.filter((c) =>
    kind === 'transfer' ? true : c.kind === (kind === 'income' ? 'income' : 'expense')
  );

  function resetForm() {
    setKind('expense');
    setCategoryId('');
    setAccountId('');
    setRawAmount('');
    setNote('');
    setFrequency('monthly');
    setNextRunDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
  }

  async function handleSave() {
    const amountMinor = parseMoney(rawAmount, currency);
    if (!categoryId || !accountId || amountMinor <= 0) return;
    const payload: CreateRecurringPayload = {
      id: uuid(),
      account_id: accountId,
      category_id: categoryId,
      kind,
      amount_minor: amountMinor,
      note: note.trim(),
      frequency,
      next_run_date: nextRunDate,
      end_date: endDate || undefined,
    };
    setSheetOpen(false);
    resetForm();
    await createRule.mutateAsync(payload);
  }

  async function handleToggle(rule: (typeof rules)[0]) {
    const payload: UpdateRecurringPayload = {
      id: rule.id,
      account_id: rule.account_id,
      category_id: rule.category_id,
      kind: rule.kind as TransactionKind,
      amount_minor: Number(rule.amount_minor),
      note: rule.note,
      frequency: rule.frequency as RecurringFrequency,
      next_run_date: rule.next_run_date,
      end_date: rule.end_date,
      active: !rule.active,
    };
    await updateRule.mutateAsync(payload);
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t.recurring.title}</h1>
        <button className={styles.addBtn} onClick={() => setSheetOpen(true)} type="button" aria-label={t.recurring.new}>
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </header>

      <div className={styles.body}>
        {isLoading ? (
          <div className={styles.skeletonList}>
            {[1, 2, 3].map((i) => <Skeleton key={i} width="100%" height="80px" radius="16px" />)}
          </div>
        ) : rules.length === 0 ? (
          <EmptyState
            title={t.recurring.emptyTitle}
            body={t.recurring.emptyBody}
            action={<Button onClick={() => setSheetOpen(true)}>{t.recurring.new}</Button>}
          />
        ) : (
          rules.map((rule) => {
            const cat = categories.find((c) => c.id === rule.category_id);
            const acc = accounts.find((a) => a.id === rule.account_id);
            const isActive = rule.active === true || String(rule.active) === 'true';

            return (
              <Card key={rule.id} className={`${styles.ruleCard} ${!isActive ? styles.ruleInactive : ''}`}>
                <div className={styles.ruleTop}>
                  <div className={styles.ruleMeta}>
                    <span className={styles.catIcon}><CategoryIcon slug={cat?.icon ?? 'otros'} size={18} /></span>
                    <div>
                      <p className={styles.catName}>{cat?.name ?? '—'}</p>
                      <p className={styles.ruleDetail}>
                        {acc?.name ?? '—'} · {FREQ_LABEL[rule.frequency as RecurringFrequency] ?? rule.frequency}
                      </p>
                    </div>
                  </div>
                  <div className={styles.ruleRight}>
                    <span className={`${styles.amount} ${rule.kind === 'income' ? styles.income : styles.expense}`}>
                      {rule.kind === 'income' ? '+' : '−'}
                      {formatMoney(money(Number(rule.amount_minor)), currency)}
                    </span>
                  </div>
                </div>

                <div className={styles.ruleBottom}>
                  <span className={styles.nextRun}>
                    {t.recurring.nextRun}: {rule.next_run_date}
                  </span>
                  <div className={styles.ruleActions}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => handleToggle(rule)}
                      type="button"
                      aria-label={t.recurring.toggleActive}
                    >
                      {isActive ? <Pause size={14} strokeWidth={2} /> : <Play size={14} strokeWidth={2} />}
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteAction}`}
                      onClick={() => setConfirmDelete(rule.id)}
                      type="button"
                      aria-label={t.common.delete}
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Sheet nueva regla ── */}
      <BottomSheet open={sheetOpen} title={t.recurring.new} onClose={() => { setSheetOpen(false); resetForm(); }}>
        <div className={styles.form}>
          {/* Tipo */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tipo</label>
            <div className={styles.kindRow}>
              {(['expense', 'income'] as TransactionKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`${styles.kindBtn} ${kind === k ? styles.kindActive : ''} ${k === 'income' ? styles.kindIncome : ''}`}
                  onClick={() => { setKind(k); setCategoryId(''); }}
                >
                  {k === 'expense' ? t.register.expense : t.register.income}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t.budgets.category}</label>
              <select className={styles.select} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">—</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t.register.account}</label>
              <select className={styles.select} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Monto</label>
              <input
                type="number"
                inputMode="decimal"
                className={styles.input}
                placeholder="0.00"
                value={rawAmount}
                onChange={(e) => setRawAmount(e.target.value)}
                min="0"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t.register.note}</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Opcional"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={80}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t.recurring.frequency}</label>
            <div className={styles.freqGrid}>
              {FREQUENCIES.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`${styles.freqBtn} ${frequency === f ? styles.freqActive : ''}`}
                  onClick={() => setFrequency(f)}
                >
                  {FREQ_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t.recurring.nextRun}</label>
              <input
                type="date"
                className={styles.input}
                value={nextRunDate}
                onChange={(e) => setNextRunDate(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t.recurring.endDate}</label>
              <input
                type="date"
                className={styles.input}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder={t.recurring.noEndDate}
              />
            </div>
          </div>

          <Button
            block
            onClick={handleSave}
            disabled={!categoryId || !accountId || !rawAmount || createRule.isPending}
          >
            {createRule.isPending ? '…' : t.common.save}
          </Button>
        </div>
      </BottomSheet>

      {/* ── Confirmar borrado ── */}
      {confirmDelete && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.confirmSheet}>
            <p className={styles.confirmText}>{t.recurring.deleteConfirm}</p>
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>{t.common.cancel}</Button>
              <Button variant="danger" onClick={() => { deleteRule.mutate(confirmDelete); setConfirmDelete(null); }}>
                {t.common.delete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
