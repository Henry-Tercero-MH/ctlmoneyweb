import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { Sun, Moon, ChevronRight, Plus, Trash2, Pencil, PiggyBank, RefreshCw, Target, Download, FileJson, FileText, MonitorDown } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { exportApi } from '@/api/endpoints/export';
import { CategoryIcon, ICON_OPTIONS } from '@/ui/components/CategoryIcon';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useAccounts, useCreateAccount, useUpdateAccount, useArchiveAccount } from '@/hooks/useAccounts';
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { useSetSetting } from '@/hooks/useSettings';
import { Card } from '@/ui/components/Card';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { BottomSheet } from '@/ui/components/BottomSheet';
import { Button } from '@/ui/components/Button';
import { t } from '@/i18n/es';
import type { CurrencyCode } from '@/core/money';
import type { AccountType, CategoryKind } from '@/api/types';
import type { UpsertAccountPayload } from '@/api/endpoints/accounts';
import type { UpsertCategoryPayload } from '@/api/endpoints/categories';
import styles from './MoreScreen.module.css';

const CURRENCIES: { value: CurrencyCode; label: string }[] = [
  { value: 'GTQ', label: 'GTQ' },
  { value: 'USD', label: 'USD' },
  { value: 'MXN', label: 'MXN' },
  { value: 'EUR', label: 'EUR' },
];

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'card', 'savings', 'investment'];


const THEME_OPTIONS = [
  { value: 'light' as const, label: t.more.themeLight },
  { value: 'dark' as const, label: t.more.themeDark },
];

type AccountForm = { id: string; name: string; type: AccountType; initial_balance_minor: string; currency: string };
type CategoryForm = { id: string; name: string; kind: CategoryKind; icon: string; color: string };

const BLANK_ACCOUNT: AccountForm = { id: '', name: '', type: 'cash', initial_balance_minor: '0', currency: 'GTQ' };
const BLANK_CATEGORY: CategoryForm = { id: '', name: '', kind: 'expense', icon: 'otros', color: '#f5c800' };

export default function MoreScreen() {
  const { canInstall, isInstalled, install } = usePwaInstall();
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const currency = useUiStore((s) => s.activeCurrency) as CurrencyCode;
  const setCurrency = useUiStore((s) => s.setCurrency);
  const navigate = useNavigate();
  const setSetting = useSetSetting();

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const archiveAccount = useArchiveAccount();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  // ── Account sheet ──
  const [accountSheet, setAccountSheet] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountForm>(BLANK_ACCOUNT);
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null);

  // ── Category sheet ──
  const [categorySheet, setCategorySheet] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(BLANK_CATEGORY);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);

  const customCategories = categories.filter((c) => !c.is_system && String(c.is_system) !== 'TRUE');

  function openNewAccount() {
    setAccountForm({ ...BLANK_ACCOUNT, id: uuid(), currency });
    setAccountSheet(true);
  }

  function openEditAccount(acc: (typeof accounts)[0]) {
    setAccountForm({
      id: acc.id,
      name: acc.name,
      type: acc.type,
      initial_balance_minor: String(acc.initial_balance_minor / 100),
      currency: acc.currency,
    });
    setAccountSheet(true);
  }

  async function handleSaveAccount() {
    const payload: UpsertAccountPayload = {
      id: accountForm.id,
      name: accountForm.name.trim(),
      type: accountForm.type,
      initial_balance_minor: Math.round(parseFloat(accountForm.initial_balance_minor || '0') * 100),
      currency: accountForm.currency,
    };
    const isEdit = accounts.some((a) => a.id === payload.id);
    setAccountSheet(false);
    if (isEdit) await updateAccount.mutateAsync(payload);
    else await createAccount.mutateAsync(payload);
  }

  async function handleSaveCategory() {
    const payload: UpsertCategoryPayload = {
      id: categoryForm.id || uuid(),
      name: categoryForm.name.trim(),
      kind: categoryForm.kind,
      icon: categoryForm.icon,
      color: categoryForm.color,
      sort_order: 999,
    };
    setCategorySheet(false);
    await createCategory.mutateAsync(payload);
    setCategoryForm(BLANK_CATEGORY);
  }

  function handleCurrencyChange(c: CurrencyCode) {
    setCurrency(c);
    setSetting.mutate({ key: 'active_currency', value: c });
  }

  function handleThemeChange(th: 'light' | 'dark') {
    setTheme(th);
    setSetting.mutate({ key: 'theme', value: th });
  }

  // ── Export ──
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);

  async function handleExportJson() {
    setExporting('json');
    try {
      const result = await exportApi.json();
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      triggerDownload(blob, `ctlmoney_${result.exported_at.slice(0, 10)}.json`);
    } finally { setExporting(null); }
  }

  async function handleExportCsv() {
    setExporting('csv');
    try {
      const result = await exportApi.csv();
      // ZIP simulado: un CSV por hoja, concatenados con separador legible
      const content = Object.entries(result.sheets)
        .map(([name, csv]) => `### ${name}\n${csv}`)
        .join('\n\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
      triggerDownload(blob, `ctlmoney_${result.exported_at.slice(0, 10)}.csv`);
    } finally { setExporting(null); }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t.more.title}</h1>
      </header>

      <div className={styles.body}>

        {/* ── Perfil ── */}
        {profile && (
          <Card className={styles.profileCard}>
            {profile.picture && (
              <img src={profile.picture} alt={profile.name} className={styles.avatar}
                width={52} height={52} referrerPolicy="no-referrer" />
            )}
            <div>
              <p className={styles.profileName}>{profile.name}</p>
              <p className={styles.profileEmail}>{profile.email}</p>
            </div>
          </Card>
        )}

        {/* ── Tema ── */}
        <div className={styles.settingBlock}>
          <div className={styles.settingLabel}>
            {theme === 'light' ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
            {t.more.theme}
          </div>
          <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={handleThemeChange} ariaLabel={t.more.theme} />
        </div>

        {/* ── Moneda ── */}
        <div className={styles.settingBlock}>
          <p className={styles.settingLabel}>{t.more.currency}</p>
          <div className={styles.currencyRow}>
            {CURRENCIES.map((c) => (
              <button key={c.value} type="button"
                className={`${styles.currencyChip} ${currency === c.value ? styles.chipActive : ''}`}
                onClick={() => handleCurrencyChange(c.value)} aria-pressed={currency === c.value}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Accesos Fase 2 ── */}
        <Card className={styles.listCard}>
          <div className={`${styles.listRow} ${styles.rowBorder}`}
            onClick={() => navigate('/presupuestos')} role="button" tabIndex={0}>
            <div className={styles.catRow}>
              <span className={styles.catIcon}><PiggyBank size={18} strokeWidth={1.75} /></span>
              <p className={styles.listRowName}>{t.budgets.title}</p>
            </div>
            <ChevronRight size={16} strokeWidth={1.75} className={styles.rowChevron} />
          </div>
          <div className={`${styles.listRow} ${styles.rowBorder}`}
            onClick={() => navigate('/recurrentes')} role="button" tabIndex={0}>
            <div className={styles.catRow}>
              <span className={styles.catIcon}><RefreshCw size={18} strokeWidth={1.75} /></span>
              <p className={styles.listRowName}>{t.recurring.title}</p>
            </div>
            <ChevronRight size={16} strokeWidth={1.75} className={styles.rowChevron} />
          </div>
          <div className={styles.listRow}
            onClick={() => navigate('/metas')} role="button" tabIndex={0}>
            <div className={styles.catRow}>
              <span className={styles.catIcon}><Target size={18} strokeWidth={1.75} /></span>
              <p className={styles.listRowName}>{t.goals.title}</p>
            </div>
            <ChevronRight size={16} strokeWidth={1.75} className={styles.rowChevron} />
          </div>
        </Card>

        {/* ── Cuentas ── */}
        <div className={styles.listBlock}>
          <div className={styles.listHeader}>
            <p className={styles.listTitle}>{t.more.accounts}</p>
            <button className={styles.addIconBtn} onClick={openNewAccount} type="button" aria-label={t.more.addAccount}>
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
          <Card className={styles.listCard}>
            {accounts.length === 0 ? (
              <p className={styles.listEmpty}>Sin cuentas. Agrega una.</p>
            ) : (
              accounts.map((acc, i) => (
                <div key={acc.id}
                  className={`${styles.listRow} ${i < accounts.length - 1 ? styles.rowBorder : ''}`}>
                  <div>
                    <p className={styles.listRowName}>{acc.name}</p>
                    <p className={styles.listRowSub}>{t.accountTypes[acc.type]}</p>
                  </div>
                  <div className={styles.rowActions}>
                    <button className={styles.rowActionBtn} onClick={() => openEditAccount(acc)}
                      type="button" aria-label={t.common.edit}>
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button className={`${styles.rowActionBtn} ${styles.rowDeleteBtn}`}
                      onClick={() => setConfirmArchive(acc.id)} type="button" aria-label="Archivar">
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* ── Categorías personalizadas ── */}
        <div className={styles.listBlock}>
          <div className={styles.listHeader}>
            <p className={styles.listTitle}>{t.more.categories}</p>
            <button className={styles.addIconBtn}
              onClick={() => { setCategoryForm({ ...BLANK_CATEGORY, id: uuid() }); setCategorySheet(true); }}
              type="button" aria-label={t.more.addCategory}>
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
          <Card className={styles.listCard}>
            {customCategories.length === 0 ? (
              <p className={styles.listEmpty}>Solo categorías del sistema.</p>
            ) : (
              customCategories.map((cat, i) => (
                <div key={cat.id}
                  className={`${styles.listRow} ${i < customCategories.length - 1 ? styles.rowBorder : ''}`}>
                  <div className={styles.catRow}>
                    <span className={styles.catIcon}><CategoryIcon slug={cat.icon || 'otros'} size={18} /></span>
                    <div>
                      <p className={styles.listRowName}>{cat.name}</p>
                      <p className={styles.listRowSub}>
                        {cat.kind === 'income' ? t.register.income : t.register.expense}
                      </p>
                    </div>
                  </div>
                  <button className={`${styles.rowActionBtn} ${styles.rowDeleteBtn}`}
                    onClick={() => setConfirmDeleteCat(cat.id)} type="button" aria-label={t.common.delete}>
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* ── Exportar datos ── */}
        <div className={styles.listBlock}>
          <p className={styles.listTitle}>{t.more.backup}</p>
          <Card className={styles.listCard}>
            <div className={`${styles.listRow} ${styles.rowBorder}`}
              onClick={handleExportJson} role="button" tabIndex={0}>
              <div className={styles.catRow}>
                <span className={styles.catIcon}><FileJson size={18} strokeWidth={1.75} /></span>
                <div>
                  <p className={styles.listRowName}>{t.more.exportJson}</p>
                  <p className={styles.listRowSub}>Todas las hojas en un archivo</p>
                </div>
              </div>
              {exporting === 'json'
                ? <span className={styles.exportSpinner}>…</span>
                : <Download size={16} strokeWidth={1.75} className={styles.rowChevron} />}
            </div>
            <div className={styles.listRow}
              onClick={handleExportCsv} role="button" tabIndex={0}>
              <div className={styles.catRow}>
                <span className={styles.catIcon}><FileText size={18} strokeWidth={1.75} /></span>
                <div>
                  <p className={styles.listRowName}>{t.more.exportCsv}</p>
                  <p className={styles.listRowSub}>Compatible con Excel y Google Sheets</p>
                </div>
              </div>
              {exporting === 'csv'
                ? <span className={styles.exportSpinner}>…</span>
                : <Download size={16} strokeWidth={1.75} className={styles.rowChevron} />}
            </div>
          </Card>
        </div>

        {/* ── Instalar app ── */}
        {(canInstall || isInstalled) && (
          <button
            type="button"
            className={styles.installBtn}
            onClick={install}
            disabled={isInstalled}
          >
            <MonitorDown size={18} strokeWidth={1.75} />
            {isInstalled ? 'App instalada' : 'Instalar app'}
          </button>
        )}

        {/* ── Cerrar sesión ── */}
        <button type="button" className={styles.signOutBtn} onClick={handleSignOut}>
          {t.auth.signOut}
        </button>
      </div>

      {/* ══ Sheet — Nueva/Editar cuenta ══ */}
      <BottomSheet
        open={accountSheet}
        title={accounts.some((a) => a.id === accountForm.id) ? t.common.edit : t.more.addAccount}
        onClose={() => setAccountSheet(false)}
      >
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t.more.name}</label>
            <input className={styles.input} type="text" maxLength={40} placeholder="Ej: Banco Industrial"
              value={accountForm.name} onChange={(e) => setAccountForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t.more.type}</label>
            <div className={styles.typeGrid}>
              {ACCOUNT_TYPES.map((tp) => (
                <button key={tp} type="button"
                  className={`${styles.typeBtn} ${accountForm.type === tp ? styles.typeActive : ''}`}
                  onClick={() => setAccountForm((f) => ({ ...f, type: tp }))}>
                  {t.accountTypes[tp]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t.more.initialBalance}</label>
              <input className={styles.input} type="number" inputMode="decimal" placeholder="0.00" min="0"
                value={accountForm.initial_balance_minor}
                onChange={(e) => setAccountForm((f) => ({ ...f, initial_balance_minor: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t.more.currency}</label>
              <select className={styles.select}
                value={accountForm.currency}
                onChange={(e) => setAccountForm((f) => ({ ...f, currency: e.target.value }))}>
                {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <Button block onClick={handleSaveAccount}
            disabled={!accountForm.name.trim() || createAccount.isPending || updateAccount.isPending}>
            {t.common.save}
          </Button>
        </div>
      </BottomSheet>

      {/* ══ Sheet — Nueva categoría ══ */}
      <BottomSheet open={categorySheet} title={t.more.addCategory} onClose={() => setCategorySheet(false)}>
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t.more.name}</label>
            <input className={styles.input} type="text" maxLength={30} placeholder="Ej: Gym"
              value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tipo</label>
            <div className={styles.kindRow}>
              {(['expense', 'income'] as CategoryKind[]).map((k) => (
                <button key={k} type="button"
                  className={`${styles.kindBtn} ${categoryForm.kind === k ? styles.kindActive : ''} ${k === 'income' ? styles.kindIncome : ''}`}
                  onClick={() => setCategoryForm((f) => ({ ...f, kind: k }))}>
                  {k === 'income' ? t.register.income : t.register.expense}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Ícono</label>
            <div className={styles.iconGrid}>
              {ICON_OPTIONS.map(({ slug, Icon }) => (
                <button key={slug} type="button"
                  className={`${styles.iconBtn} ${categoryForm.icon === slug ? styles.iconActive : ''}`}
                  onClick={() => setCategoryForm((f) => ({ ...f, icon: slug }))}
                  title={slug}>
                  <Icon size={18} strokeWidth={1.75} />
                </button>
              ))}
            </div>
          </div>

          <Button block onClick={handleSaveCategory}
            disabled={!categoryForm.name.trim() || createCategory.isPending}>
            {t.common.save}
          </Button>
        </div>
      </BottomSheet>

      {/* ══ Confirmar archivar cuenta ══ */}
      {confirmArchive && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.confirmSheet}>
            <p className={styles.confirmText}>¿Archivar esta cuenta? No se eliminan sus movimientos.</p>
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={() => setConfirmArchive(null)}>{t.common.cancel}</Button>
              <Button variant="danger" onClick={() => { archiveAccount.mutate(confirmArchive); setConfirmArchive(null); }}>
                Archivar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Confirmar borrar categoría ══ */}
      {confirmDeleteCat && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.confirmSheet}>
            <p className={styles.confirmText}>¿Eliminar esta categoría?</p>
            <div className={styles.confirmActions}>
              <Button variant="secondary" onClick={() => setConfirmDeleteCat(null)}>{t.common.cancel}</Button>
              <Button variant="danger" onClick={() => { deleteCategory.mutate(confirmDeleteCat); setConfirmDeleteCat(null); }}>
                {t.common.delete}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
