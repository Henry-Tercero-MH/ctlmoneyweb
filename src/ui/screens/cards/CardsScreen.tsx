import { useState } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuid } from 'uuid';
import { differenceInCalendarDays } from 'date-fns';
import { Plus, Pencil, Trash2, CalendarClock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useCreditCardsStore } from '@/stores/creditCardsStore';
import { useUiStore } from '@/stores/uiStore';
import { computeCardCycle, type CreditCard, type AlertLevel } from '@/core/creditCard';
import { formatLongDate, formatDayMonth, parseISO } from '@/core/dates';
import { formatMoney, money } from '@/core/money';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import type { CurrencyCode } from '@/core/money';
import styles from './CardsScreen.module.css';

const CURRENCIES = ['GTQ', 'USD', 'MXN', 'EUR'];

type Form = {
  id: string;
  name: string;
  cutoffDay: string;
  paymentDay: string;
  limit: string;
  currency: string;
};

function blankForm(currency: string): Form {
  return { id: '', name: '', cutoffDay: '8', paymentDay: '2', limit: '', currency };
}

const LEVEL_LABEL: Record<AlertLevel, string> = {
  ok: 'Al día',
  soon: 'Se acerca el pago',
  urgent: '¡Paga pronto!',
};

export default function CardsScreen() {
  const activeCurrency = useUiStore((s) => s.activeCurrency) as CurrencyCode;
  const cards = useCreditCardsStore((s) => s.cards);
  const upsert = useCreditCardsStore((s) => s.upsert);
  const remove = useCreditCardsStore((s) => s.remove);

  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState<Form>(blankForm(activeCurrency));
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const isEditing = cards.some((c) => c.id === form.id);

  function openNew() {
    setForm(blankForm(activeCurrency));
    setSheet(true);
  }

  function openEdit(card: CreditCard) {
    setForm({
      id: card.id,
      name: card.name,
      cutoffDay: String(card.cutoffDay),
      paymentDay: String(card.paymentDay),
      limit: card.limitMinor > 0 ? String(card.limitMinor / 100) : '',
      currency: card.currency,
    });
    setSheet(true);
  }

  function clampDay(v: string): number {
    const n = parseInt(v, 10) || 1;
    return Math.min(Math.max(n, 1), 31);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    upsert({
      id: form.id || uuid(),
      name: form.name.trim(),
      cutoffDay: clampDay(form.cutoffDay),
      paymentDay: clampDay(form.paymentDay),
      limitMinor: form.limit ? Math.round(parseFloat(form.limit.replace(',', '.')) * 100) || 0 : 0,
      currency: form.currency,
    });
    setSheet(false);
  }

  function handleDelete(id: string) {
    setConfirmId(null);
    remove(id);
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

      {/* ── Formulario ── */}
      <BottomSheet open={sheet} title={isEditing ? 'Editar tarjeta' : 'Nueva tarjeta'} onClose={() => setSheet(false)}>
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
              <label className={styles.fieldLabel}>Moneda</label>
              <select
                className={styles.select}
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <Button block onClick={handleSave} disabled={!form.name.trim()}>
            {isEditing ? 'Guardar cambios' : 'Agregar tarjeta'}
          </Button>
        </div>
      </BottomSheet>

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
