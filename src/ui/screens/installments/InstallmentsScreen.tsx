import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Plus, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { useInstallments, useCreateInstallment, useUpdateInstallment, useDeleteInstallment } from '@/hooks/useInstallments';
import { useAccounts } from '@/hooks/useAccounts';
import { useUiStore } from '@/stores/uiStore';
import { formatMoney, money } from '@/core/money';
import { todayISO } from '@/core/dates';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { Button } from '@/ui/components/Button';
import { EmptyState } from '@/ui/components/EmptyState';
import { Skeleton } from '@/ui/components/Skeleton';
import type { CurrencyCode } from '@/core/money';
import type { InstallmentDTO } from '@/api/types';
import styles from './InstallmentsScreen.module.css';

type Form = {
  id: string; name: string; total_minor: string;
  installment_count: string; account_id: string; start_date: string;
};

const BLANK: Form = { id: '', name: '', total_minor: '', installment_count: '', account_id: '', start_date: todayISO() };

// ── Dona SVG ─────────────────────────────────────────────────────────────────
function DonutProgress({ paid, total }: { paid: number; total: number }) {
  const R = 36;
  const STROKE = 8;
  const CX = 44;
  const CY = 44;
  const circumference = 2 * Math.PI * R;
  const pct = total > 0 ? paid / total : 0;
  const dash = pct * circumference;
  const gap = circumference - dash;
  const done = paid >= total;

  return (
    <svg viewBox="0 0 88 88" className={styles.donut} aria-hidden="true">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-border)" strokeWidth={STROKE} />
      {pct > 0 && (
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={done ? 'var(--color-income)' : 'var(--color-primary)'}
          strokeWidth={STROKE}
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      )}
    </svg>
  );
}

// ── Pantalla ──────────────────────────────────────────────────────────────────
export default function InstallmentsScreen() {
  const currency = useUiStore((s) => s.activeCurrency) as CurrencyCode;
  const { data: installments = [], isLoading } = useInstallments();
  const { data: accounts = [] } = useAccounts();
  const createInst = useCreateInstallment();
  const updateInst = useUpdateInstallment();
  const deleteInst = useDeleteInstallment();

  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState<Form>(BLANK);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const isEditing = installments.some((i) => i.id === form.id);

  // Resumen top
  const totalPending = installments.reduce((acc, i) => {
    const perCuota = i.installment_count > 0 ? i.total_minor / i.installment_count : 0;
    const remaining = i.installment_count - i.paid_count;
    return acc + perCuota * remaining;
  }, 0);
  const totalPaid = installments.reduce((acc, i) => {
    const perCuota = i.installment_count > 0 ? i.total_minor / i.installment_count : 0;
    return acc + perCuota * i.paid_count;
  }, 0);

  function openNew() {
    setForm(BLANK);
    setSheet(true);
  }

  function openEdit(inst: InstallmentDTO) {
    setForm({
      id: inst.id,
      name: inst.name,
      total_minor: String(inst.total_minor / 100),
      installment_count: String(inst.installment_count),
      account_id: inst.account_id ?? '',
      start_date: inst.start_date,
    });
    setSheet(true);
  }

  async function handleSave() {
    const totalMinor = Math.round(parseFloat(form.total_minor.replace(',', '.')) * 100) || 0;
    const count = parseInt(form.installment_count, 10) || 0;
    if (!form.name.trim() || totalMinor <= 0 || count < 1) return;

    if (isEditing) {
      const existing = installments.find((i) => i.id === form.id)!;
      await updateInst.mutateAsync({
        id: form.id,
        name: form.name.trim(),
        total_minor: totalMinor,
        installment_count: count,
        paid_count: existing.paid_count,
        account_id: form.account_id,
        start_date: form.start_date,
      });
    } else {
      await createInst.mutateAsync({
        id: uuid(),
        name: form.name.trim(),
        total_minor: totalMinor,
        installment_count: count,
        account_id: form.account_id,
        start_date: form.start_date,
      });
    }
    setSheet(false);
  }

  async function handlePayCuota(inst: InstallmentDTO) {
    if (inst.paid_count >= inst.installment_count) return;
    await updateInst.mutateAsync({
      id: inst.id,
      name: inst.name,
      total_minor: inst.total_minor,
      installment_count: inst.installment_count,
      paid_count: inst.paid_count + 1,
      account_id: inst.account_id,
      start_date: inst.start_date,
    });
  }

  async function handleDelete(id: string) {
    setConfirmId(null);
    await deleteInst.mutateAsync(id);
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cuotas</h1>
        <button className={styles.addBtn} onClick={openNew} type="button" aria-label="Nueva cuota">
          <Plus size={20} strokeWidth={2} />
        </button>
      </header>

      <div className={styles.body}>
        {isLoading ? (
          <>
            <Skeleton width="100%" height="80px" radius="16px" />
            <Skeleton width="100%" height="180px" radius="16px" />
            <Skeleton width="100%" height="180px" radius="16px" />
          </>
        ) : (
          <>
            {/* ── Resumen ── */}
            {installments.length > 0 && (
              <div className={styles.summaryRow}>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Por pagar</p>
                  <p className={styles.summaryValue}>{formatMoney(money(totalPending), currency)}</p>
                </div>
                <div className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Ya pagado</p>
                  <p className={styles.summaryValue}>{formatMoney(money(totalPaid), currency)}</p>
                </div>
              </div>
            )}

            {/* ── Lista ── */}
            {installments.length === 0 ? (
              <EmptyState
                title="Sin cuotas registradas"
                action={<Button variant="secondary" onClick={openNew}>Registrar compra</Button>}
              />
            ) : (
              installments.map((inst) => {
                const perCuota = inst.installment_count > 0 ? inst.total_minor / inst.installment_count : 0;
                const paid = inst.paid_count;
                const total = inst.installment_count;
                const done = paid >= total;
                const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                const remaining = total - paid;
                const nextDate = nextInstallmentDate(inst.start_date, paid);

                return (
                  <div key={inst.id} className={styles.card}>
                    <div className={styles.cardHeader}>
                      <p className={styles.cardName}>{inst.name}</p>
                      <div className={styles.cardActions}>
                        <button className={styles.actionBtn} onClick={() => openEdit(inst)} type="button">
                          <Pencil size={14} strokeWidth={1.75} />
                        </button>
                        <button className={`${styles.actionBtn} ${styles.actionDelete}`} onClick={() => setConfirmId(inst.id)} type="button">
                          <Trash2 size={14} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>

                    <div className={styles.cardBody}>
                      {/* Dona */}
                      <div className={styles.donutWrap}>
                        <DonutProgress paid={paid} total={total} />
                        <div className={styles.donutCenter}>
                          <span className={styles.donutPct}>{pct}%</span>
                          <span className={styles.donutSub}>{paid}/{total}</span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className={styles.cardInfo}>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Total</span>
                          <span className={styles.infoValue}>{formatMoney(money(inst.total_minor), currency)}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Por cuota</span>
                          <span className={styles.infoValue}>{formatMoney(money(Math.round(perCuota)), currency)}</span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoLabel}>Restante</span>
                          <span className={`${styles.infoValue} ${done ? styles.infoValueGreen : styles.infoValueYellow}`}>
                            {formatMoney(money(Math.round(perCuota * remaining)), currency)}
                          </span>
                        </div>
                        {!done && (
                          <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Próx. cuota</span>
                            <span className={styles.infoValue}>{nextDate}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Puntos de progreso */}
                    <div className={styles.cuotasRow}>
                      {Array.from({ length: total }).map((_, i) => (
                        <div
                          key={i}
                          className={`${styles.cuotaDot} ${i < paid ? (done ? styles.cuotaDotAll : styles.cuotaDotPaid) : ''}`}
                        />
                      ))}
                    </div>

                    {/* Acción */}
                    {done ? (
                      <div className={styles.completedBadge}>
                        <CheckCircle2 size={16} strokeWidth={1.75} />
                        ¡Pagada en su totalidad!
                      </div>
                    ) : (
                      <button
                        className={styles.payBtn}
                        onClick={() => handlePayCuota(inst)}
                        disabled={updateInst.isPending}
                        type="button"
                      >
                        Marcar cuota {paid + 1} como pagada
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* ── Sheet formulario ── */}
      <BottomSheet open={sheet} title={isEditing ? 'Editar cuota' : 'Nueva compra en cuotas'} onClose={() => setSheet(false)}>
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nombre del producto / compra</label>
            <input
              className={styles.input}
              placeholder="Ej. Laptop, Teléfono..."
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={80}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Monto total</label>
              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={form.total_minor}
                onChange={(e) => setForm((f) => ({ ...f, total_minor: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Número de cuotas</label>
              <input
                className={styles.input}
                type="number"
                inputMode="numeric"
                placeholder="12"
                min="1"
                max="120"
                value={form.installment_count}
                onChange={(e) => setForm((f) => ({ ...f, installment_count: e.target.value }))}
              />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Fecha inicio</label>
              <input
                className={styles.input}
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Cuenta (opcional)</label>
              <select
                className={styles.select}
                value={form.account_id}
                onChange={(e) => setForm((f) => ({ ...f, account_id: e.target.value }))}
              >
                <option value="">Sin cuenta</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          {/* Preview */}
          {form.total_minor && form.installment_count && (
            <div className={styles.summaryCard} style={{ marginTop: 0 }}>
              <p className={styles.summaryLabel}>Cuota mensual</p>
              <p className={styles.summaryValue}>
                {formatMoney(
                  money(Math.round((parseFloat(form.total_minor.replace(',', '.')) * 100) / Math.max(parseInt(form.installment_count, 10) || 1, 1))),
                  currency
                )}
              </p>
            </div>
          )}
          <Button
            block
            onClick={handleSave}
            disabled={!form.name.trim() || !form.total_minor || !form.installment_count || createInst.isPending || updateInst.isPending}
          >
            {(createInst.isPending || updateInst.isPending) ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </BottomSheet>

      {/* ── Confirm delete ── */}
      {confirmId && (
        <div className={styles.overlay}>
          <div className={styles.confirmSheet}>
            <p className={styles.confirmText}>¿Eliminar esta cuota?</p>
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancelar</Button>
              <Button variant="danger" onClick={() => handleDelete(confirmId)}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function nextInstallmentDate(startDate: string, paidCount: number): string {
  if (!startDate) return '—';
  const parts = startDate.split('-');
  const y = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '1', 10) - 1;
  const d = parseInt(parts[2] ?? '1', 10);
  const dt = new Date(y, m + paidCount, d);
  return dt.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
