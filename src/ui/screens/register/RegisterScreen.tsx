import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { Button } from '@/ui/components/Button';
import { NumericKeyboard } from './NumericKeyboard';
import { useUiStore } from '@/stores/uiStore';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { currentYearMonth, todayISO } from '@/core/dates';
import { parseMoney, formatAmount, money, ZERO } from '@/core/money';
import { t } from '@/i18n/es';
import type { TransactionKind } from '@/api/types';
import type { CurrencyCode } from '@/core/money';
import styles from './RegisterScreen.module.css';

const KIND_OPTIONS = [
  { value: 'expense' as TransactionKind, label: t.register.expense },
  { value: 'income' as TransactionKind, label: t.register.income },
  { value: 'transfer' as TransactionKind, label: t.register.transfer },
];

export function RegisterScreen() {
  const open = useUiStore((s) => s.registerOpen);
  const close = useUiStore((s) => s.closeRegister);
  const currency = useUiStore((s) => s.activeCurrency) as CurrencyCode;
  const yearMonth = currentYearMonth();

  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const createTx = useCreateTransaction(yearMonth);

  // ── Form state ──
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [rawAmount, setRawAmount] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [transferAccountId, setTransferAccountId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');

  const amountMoney = parseMoney(rawAmount, currency);
  const isValid =
    amountMoney > ZERO &&
    categoryId !== '' &&
    accountId !== '' &&
    (kind !== 'transfer' || transferAccountId !== '');

  // ── Teclado numérico ──
  const handleKey = useCallback((key: string) => {
    setRawAmount((prev) => {
      if (key === 'del') return prev.length <= 1 ? '0' : prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      // Máximo 2 decimales
      const dotIdx = prev.indexOf('.');
      if (dotIdx !== -1 && prev.length - dotIdx > 2) return prev;
      // Limitar dígitos enteros
      if (prev === '0' && key !== '.') return key;
      return prev + key;
    });
  }, []);

  const filteredCategories = categories.filter(
    (c) => kind === 'transfer' || c.kind === (kind === 'income' ? 'income' : 'expense'),
  );

  async function handleSave() {
    if (!isValid) return;
    const id = uuid();
    close();
    await createTx.mutateAsync({
      id,
      account_id: accountId,
      category_id: categoryId,
      kind,
      amount_minor: amountMoney,
      date,
      note: note.trim(),
      transfer_account_id: kind === 'transfer' ? transferAccountId : undefined,
    });
    // Reset form
    setRawAmount('0');
    setCategoryId('');
    setNote('');
  }

  function handleClose() {
    close();
    setRawAmount('0');
    setCategoryId('');
    setNote('');
  }

  return (
    <BottomSheet open={open} title={t.register.title} onClose={handleClose}>
      <div className={styles.form}>
        {/* Tipo */}
        <SegmentedControl
          options={KIND_OPTIONS}
          value={kind}
          onChange={(v) => { setKind(v); setCategoryId(''); }}
          ariaLabel="Tipo de movimiento"
        />

        {/* Display del monto */}
        <div className={styles.amountDisplay} aria-label="Monto" aria-live="polite">
          <span className={styles.currency}>{currency}</span>
          <span className={styles.amount}>
            {formatAmount(money(amountMoney > ZERO ? amountMoney : 0), currency) || rawAmount}
          </span>
        </div>

        {/* Teclado numérico */}
        <NumericKeyboard onKey={handleKey} />

        {/* Categoría */}
        {kind !== 'transfer' && (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t.register.category}</label>
            <div className={styles.categoryGrid}>
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.catBtn} ${categoryId === cat.id ? styles.catSelected : ''}`}
                  onClick={() => setCategoryId(cat.id)}
                  aria-pressed={categoryId === cat.id}
                >
                  <span className={styles.catIcon}>{cat.icon || '•'}</span>
                  <span className={styles.catName}>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cuenta */}
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="reg-account">
              {t.register.account}
            </label>
            <select
              id="reg-account"
              className={styles.select}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">—</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {kind === 'transfer' && (
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="reg-account-to">
                {t.register.accountTo}
              </label>
              <select
                id="reg-account-to"
                className={styles.select}
                value={transferAccountId}
                onChange={(e) => setTransferAccountId(e.target.value)}
              >
                <option value="">—</option>
                {accounts.filter((a) => a.id !== accountId).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Fecha y nota */}
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="reg-date">{t.register.date}</label>
            <input
              id="reg-date"
              type="date"
              className={styles.input}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="reg-note">{t.register.note}</label>
            <input
              id="reg-note"
              type="text"
              className={styles.input}
              placeholder="Opcional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
            />
          </div>
        </div>

        {/* Guardar */}
        <Button
          block
          onClick={handleSave}
          disabled={!isValid || createTx.isPending}
          aria-label={t.register.save}
        >
          {createTx.isPending ? t.register.saving : t.register.save}
        </Button>
      </div>
    </BottomSheet>
  );
}
