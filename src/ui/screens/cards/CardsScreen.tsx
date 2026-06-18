import { useState } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuid } from 'uuid';
import { differenceInCalendarDays } from 'date-fns';
import { Plus, Pencil, Trash2, CalendarClock, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useCreditCards, useUpsertCreditCard, useDeleteCreditCard } from '@/hooks/useCreditCards';
import { useUiStore } from '@/stores/uiStore';
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { computeCardCycle, type CreditCard, type AlertLevel } from '@/core/creditCard';
import { formatLongDate, formatDayMonth, parseISO, currentYearMonth, todayISO } from '@/core/dates';
import { formatMoney, money } from '@/core/money';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import type { CurrencyCode } from '@/core/money';
import styles from './CardsScreen.module.css';

function prevYearMonth(ym: string): string {
  const parts = ym.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

type Form = {
  id: string;
  name: string;
  cutoffDay: string;
  paymentDay: string;
  limit: string;
  linkedAccountId: string;
};

function blankForm(): Form {
  return { id: '', name: '', cutoffDay: '8', paymentDay: '2', limit: '', linkedAccountId: '' };
}

const LEVEL_LABEL: Record<AlertLevel, string> = {
  ok: 'Al día',
  soon: 'Se acerca el pago',
  urgent: '¡Paga pronto!',
};

export default function CardsScreen() {
  const activeCurrency = useUiStore((s) => s.activeCurrency) as CurrencyCode;
  const { data: cards = [] } = useCreditCards();
  const upsertCard = useUpsertCreditCard();
  const deleteCard = useDeleteCreditCard();
  const { data: accounts = [] } = useAccounts();

  // Transacciones del ciclo pueden caer en este mes o el anterior (corte a mitad de mes).
  const ym = currentYearMonth();
  const { data: txThis = [] } = useTransactions(ym);
  const { data: txPrev = [] } = useTransactions(prevYearMonth(ym));
  const allTx = [...txThis, ...txPrev];

  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState<Form>(blankForm());
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const isEditing = cards.some((c) => c.id === form.id);

  /** Gasto (kind expense) en la cuenta ligada dentro del ciclo abierto: cycleStart..hoy. */
  function spentInCycle(card: CreditCard, cycleStart: string): number {
    if (!card.linkedAccountId) return 0;
    const today = todayISO();
    return allTx
      .filter(
        (t) =>
          t.account_id === card.linkedAccountId &&
          t.kind === 'expense' &&
          t.date >= cycleStart &&
          t.date <= today,
      )
      .reduce((sum, t) => sum + t.amount_minor, 0);
  }

  function openNew() {
    setForm(blankForm());
    setSheet(true);
  }

  function openEdit(card: CreditCard) {
    setForm({
      id: card.id,
      name: card.name,
      cutoffDay: String(card.cutoffDay),
      paymentDay: String(card.paymentDay),
      limit: card.limitMinor > 0 ? String(card.limitMinor / 100) : '',
      linkedAccountId: card.linkedAccountId ?? '',
    });
    setSheet(true);
  }

  function clampDay(v: string): number {
    const n = parseInt(v, 10) || 1;
    return Math.min(Math.max(n, 1), 31);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    upsertCard.mutate({
      card: {
        id: form.id || uuid(),
        name: form.name.trim(),
        cutoffDay: clampDay(form.cutoffDay),
        paymentDay: clampDay(form.paymentDay),
        limitMinor: form.limit ? Math.round(parseFloat(form.limit.replace(',', '.')) * 100) || 0 : 0,
        currency: activeCurrency,
        linkedAccountId: form.linkedAccountId,
      },
      isEdit: isEditing,
    });
    setSheet(false);
  }

  function handleDelete(id: string) {
    setConfirmId(null);
    deleteCard.mutate(id);
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tarjetas</h1>
        <button className={styles.addBtn} onClick={openNew} type="button" aria-label="Nueva tarjeta">
          <Plus size={20} strokeWidth={2} />
        </button>
      </header>

      <div className={styles.body}>
        {cards.length === 0 ? (
          <EmptyState
            title="Sin tarjetas registradas"
            body="Agrega tu tarjeta con su fecha de corte y de pago para ver cuándo pagar y de qué rango a rango puedes gastar."
            action={<Button variant="secondary" onClick={openNew}>Agregar tarjeta</Button>}
          />
        ) : (
          cards.map((card) => {
            const cycle = computeCardCycle(card);
            const cycleLen = Math.max(
              differenceInCalendarDays(parseISO(cycle.cycleEnd), parseISO(cycle.cycleStart)),
              1,
            );
            const elapsed = cycleLen - cycle.daysUntilCutoff;
            const pct = Math.min(Math.max((elapsed / cycleLen) * 100, 0), 100);
            const spent = spentInCycle(card, cycle.cycleStart);
            const limitPct = card.limitMinor > 0 ? Math.min((spent / card.limitMinor) * 100, 100) : 0;

            return (
              <div key={card.id} className={`${styles.card} ${styles[cycle.level]}`}>
                <div className={styles.cardHeader}>
                  <div>
                    <p className={styles.cardName}>{card.name}</p>
                    <p className={styles.cardSub}>
                      Corte día {card.cutoffDay} · Pago día {card.paymentDay}
                    </p>
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.actionBtn} onClick={() => openEdit(card)} type="button" aria-label="Editar">
                      <Pencil size={14} strokeWidth={1.75} />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.actionDelete}`}
                      onClick={() => setConfirmId(card.id)}
                      type="button"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>

                {/* Próximo pago — con color de alerta */}
                <div className={`${styles.payBox} ${styles[cycle.level]}`}>
                  <div className={styles.payIcon}>
                    {cycle.level === 'urgent' ? (
                      <AlertTriangle size={20} strokeWidth={2} />
                    ) : cycle.level === 'soon' ? (
                      <CalendarClock size={20} strokeWidth={2} />
                    ) : (
                      <CheckCircle2 size={20} strokeWidth={2} />
                    )}
                  </div>
                  <div className={styles.payInfo}>
                    <span className={styles.payStatus}>{LEVEL_LABEL[cycle.level]}</span>
                    <span className={styles.payDate}>
                      Próximo pago: {formatLongDate(cycle.nextPayment)}
                    </span>
                  </div>
                  <span className={styles.payCountdown}>
                    {cycle.daysUntilPayment === 0
                      ? 'Hoy'
                      : `${cycle.daysUntilPayment} ${cycle.daysUntilPayment === 1 ? 'día' : 'días'}`}
                  </span>
                </div>

                {/* Periodo de compras (de qué rango a rango) */}
                <div className={styles.cycleBlock}>
                  <div className={styles.cycleHeader}>
                    <span className={styles.cycleLabel}>Periodo de compras actual</span>
                    <span className={styles.cycleRange}>
                      {formatDayMonth(cycle.cycleStart)} – {formatDayMonth(cycle.cycleEnd)}
                    </span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  <p className={styles.cycleNote}>
                    Lo que compres ahora se cobra el <strong>{formatDayMonth(cycle.cycleEnd)}</strong> y
                    se paga el <strong>{formatLongDate(cycle.currentCyclePayment)}</strong>.
                  </p>
                </div>

                {/* Gasto del ciclo en la cuenta vinculada */}
                {card.linkedAccountId && (
                  <div className={styles.cycleBlock}>
                    <div className={styles.cycleHeader}>
                      <span className={styles.cycleLabel}>Gastado este ciclo</span>
                      <span className={styles.cycleRange}>{formatMoney(money(spent), activeCurrency)}</span>
                    </div>
                    {card.limitMinor > 0 && (
                      <>
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressFill}
                            style={{
                              width: `${limitPct}%`,
                              background: limitPct >= 100 ? 'var(--color-expense)' : undefined,
                            }}
                          />
                        </div>
                        <p className={styles.cycleNote}>
                          {formatMoney(money(Math.max(card.limitMinor - spent, 0)), activeCurrency)} disponibles
                          de {formatMoney(money(card.limitMinor), activeCurrency)} ({Math.round(limitPct)}%).
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div className={styles.metaRow}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Próximo corte</span>
                    <span className={styles.metaValue}>
                      {formatDayMonth(cycle.nextCutoff)}{' '}
                      <em>· {cycle.daysUntilCutoff}d</em>
                    </span>
                  </div>
                  {card.limitMinor > 0 && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Límite</span>
                      <span className={styles.metaValue}>
                        {formatMoney(money(card.limitMinor), card.currency as CurrencyCode)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Formulario (modal centrado) ── */}
      {sheet &&
        createPortal(
          <div className={styles.overlay} onClick={() => setSheet(false)}>
            <div className={styles.formModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>{isEditing ? 'Editar tarjeta' : 'Nueva tarjeta'}</h2>
                <button className={styles.formClose} onClick={() => setSheet(false)} type="button" aria-label="Cerrar">
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
              <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nombre de la tarjeta</label>
            <input
              className={styles.input}
              placeholder="Ej. Visa BAM, Mastercard..."
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={40}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Día de corte</label>
              <input
                className={styles.input}
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={form.cutoffDay}
                onChange={(e) => setForm((f) => ({ ...f, cutoffDay: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Día de pago</label>
              <input
                className={styles.input}
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={form.paymentDay}
                onChange={(e) => setForm((f) => ({ ...f, paymentDay: e.target.value }))}
              />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Límite (opcional)</label>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={form.limit}
                onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Cuenta de la tarjeta</label>
              <select
                className={styles.select}
                value={form.linkedAccountId}
                onChange={(e) => setForm((f) => ({ ...f, linkedAccountId: e.target.value }))}
              >
                <option value="">Sin vincular</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button block onClick={handleSave} disabled={!form.name.trim()}>
            {isEditing ? 'Guardar cambios' : 'Agregar tarjeta'}
          </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ── Confirmar borrado ── */}
      {confirmId &&
        createPortal(
          <div className={styles.overlay} onClick={() => setConfirmId(null)}>
            <div className={styles.confirmSheet} onClick={(e) => e.stopPropagation()}>
              <p className={styles.confirmText}>¿Eliminar esta tarjeta?</p>
              <div className={styles.confirmActions}>
                <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancelar</Button>
                <Button variant="danger" onClick={() => handleDelete(confirmId)}>Eliminar</Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
