import { useNavigate } from 'react-router-dom';
import { Sun, Moon, ChevronRight, PiggyBank, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useSetSetting } from '@/hooks/useSettings';
import { Card } from '@/ui/components/Card';
import { SegmentedControl } from '@/ui/components/SegmentedControl';
import { t } from '@/i18n/es';
import type { CurrencyCode } from '@/core/money';
import styles from './MoreScreen.module.css';

const CURRENCIES: { value: CurrencyCode; label: string }[] = [
  { value: 'GTQ', label: 'GTQ' },
  { value: 'USD', label: 'USD' },
  { value: 'MXN', label: 'MXN' },
  { value: 'EUR', label: 'EUR' },
];

const THEME_OPTIONS = [
  { value: 'light' as const, label: t.more.themeLight },
  { value: 'dark' as const, label: t.more.themeDark },
];

export default function MoreScreen() {
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

  const expenseCategories = categories.filter((c) => c.kind === 'expense' && !c.is_system);
  const incomeCategories = categories.filter((c) => c.kind === 'income' && !c.is_system);

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  function handleCurrencyChange(c: CurrencyCode) {
    setCurrency(c);
    setSetting.mutate({ key: 'active_currency', value: c });
  }

  function handleThemeChange(t: 'light' | 'dark') {
    setTheme(t);
    setSetting.mutate({ key: 'theme', value: t });
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t.more.title}</h1>
      </header>

      <div className={styles.body}>
        {/* Perfil */}
        {profile && (
          <Card className={styles.profileCard}>
            {profile.picture && (
              <img
                src={profile.picture}
                alt={profile.name}
                className={styles.avatar}
                width={44}
                height={44}
                referrerPolicy="no-referrer"
              />
            )}
            <div>
              <p className={styles.profileName}>{profile.name}</p>
              <p className={styles.profileEmail}>{profile.email}</p>
            </div>
          </Card>
        )}

        {/* Tema */}
        <div className={styles.settingBlock}>
          <div className={styles.settingLabel}>
            {theme === 'light'
              ? <Sun size={16} strokeWidth={1.75} />
              : <Moon size={16} strokeWidth={1.75} />}
            {t.more.theme}
          </div>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={theme}
            onChange={handleThemeChange}
            ariaLabel={t.more.theme}
          />
        </div>

        {/* Moneda */}
        <div className={styles.settingBlock}>
          <p className={styles.settingLabel}>{t.more.currency}</p>
          <div className={styles.currencyRow}>
            {CURRENCIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`${styles.currencyChip} ${currency === c.value ? styles.chipActive : ''}`}
                onClick={() => handleCurrencyChange(c.value)}
                aria-pressed={currency === c.value}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fase 2 — accesos directos */}
        <Card className={styles.listCard}>
          <div
            className={`${styles.listRow} ${styles.rowBorder}`}
            onClick={() => navigate('/presupuestos')}
            role="button"
            tabIndex={0}
          >
            <div className={styles.catRow}>
              <span className={styles.catIcon}><PiggyBank size={18} strokeWidth={1.75} /></span>
              <p className={styles.listRowName}>{t.budgets.title}</p>
            </div>
            <ChevronRight size={16} strokeWidth={1.75} className={styles.rowChevron} />
          </div>
          <div
            className={styles.listRow}
            onClick={() => navigate('/recurrentes')}
            role="button"
            tabIndex={0}
          >
            <div className={styles.catRow}>
              <span className={styles.catIcon}><RefreshCw size={18} strokeWidth={1.75} /></span>
              <p className={styles.listRowName}>{t.recurring.title}</p>
            </div>
            <ChevronRight size={16} strokeWidth={1.75} className={styles.rowChevron} />
          </div>
        </Card>

        {/* Cuentas */}
        <div className={styles.listBlock}>
          <div className={styles.listHeader}>
            <p className={styles.listTitle}>{t.more.accounts}</p>
            <span className={styles.listCount}>{accounts.length}</span>
          </div>
          <Card className={styles.listCard}>
            {accounts.length === 0 ? (
              <p className={styles.listEmpty}>Sin cuentas registradas.</p>
            ) : (
              accounts.map((acc, i) => (
                <div
                  key={acc.id}
                  className={`${styles.listRow} ${i < accounts.length - 1 ? styles.rowBorder : ''}`}
                >
                  <div>
                    <p className={styles.listRowName}>{acc.name}</p>
                    <p className={styles.listRowSub}>{t.accountTypes[acc.type]}</p>
                  </div>
                  <ChevronRight size={16} strokeWidth={1.75} className={styles.rowChevron} />
                </div>
              ))
            )}
          </Card>
        </div>

        {/* Categorías */}
        <div className={styles.listBlock}>
          <div className={styles.listHeader}>
            <p className={styles.listTitle}>{t.more.categories}</p>
            <span className={styles.listCount}>{expenseCategories.length + incomeCategories.length} custom</span>
          </div>
          <Card className={styles.listCard}>
            {expenseCategories.length + incomeCategories.length === 0 ? (
              <p className={styles.listEmpty}>Solo categorías del sistema.</p>
            ) : (
              [...expenseCategories, ...incomeCategories].map((cat, i, arr) => (
                <div
                  key={cat.id}
                  className={`${styles.listRow} ${i < arr.length - 1 ? styles.rowBorder : ''}`}
                >
                  <div className={styles.catRow}>
                    <span className={styles.catIcon}>{cat.icon || '•'}</span>
                    <div>
                      <p className={styles.listRowName}>{cat.name}</p>
                      <p className={styles.listRowSub}>
                        {cat.kind === 'income' ? t.register.income : t.register.expense}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        {/* Cerrar sesión */}
        <button type="button" className={styles.signOutBtn} onClick={handleSignOut}>
          {t.auth.signOut}
        </button>
      </div>
    </div>
  );
}
