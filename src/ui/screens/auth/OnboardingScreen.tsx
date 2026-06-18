import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { settingsApi } from '@/api/endpoints/settings';
import { Button } from '@/ui/components/Button';
import { toast } from '@/ui/components/toast';
import { t } from '@/i18n/es';
import type { CurrencyCode } from '@/core/money';
import styles from './OnboardingScreen.module.css';

const CURRENCIES: { value: CurrencyCode; label: string }[] = [
  { value: 'GTQ', label: 'GTQ — Quetzal' },
  { value: 'USD', label: 'USD — Dólar' },
  { value: 'MXN', label: 'MXN — Peso MX' },
  { value: 'EUR', label: 'EUR — Euro' },
];

export default function OnboardingScreen() {
  const [currency, setCurrency] = useState<CurrencyCode>('GTQ');
  const [loading, setLoading] = useState(false);
  const setCurrencyStore = useUiStore((s) => s.setCurrency);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  async function finish() {
    setLoading(true);
    try {
      // Inicializa el spreadsheet (idempotente) y guarda los settings
      await settingsApi.initialize();
      await settingsApi.set('active_currency', currency);
      await settingsApi.set('onboarding_complete', 'true');
      setCurrencyStore(currency);
      navigate('/', { replace: true });
    } catch {
      toast.error('No se pudo guardar la configuración. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        {profile && (
          <p className={styles.greeting}>
            Hola, <strong>{profile.name.split(' ')[0]}</strong>
          </p>
        )}

        <h1 className={styles.title}>{t.onboarding.title}</h1>

        <div className={styles.warningCard}>
          <p className={styles.warningText}>{t.onboarding.backupWarning}</p>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>{t.onboarding.chooseCurrency}</label>
          <div className={styles.currencyOptions}>
            {CURRENCIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`${styles.currencyBtn} ${currency === c.value ? styles.selected : ''}`}
                onClick={() => setCurrency(c.value)}
                aria-pressed={currency === c.value}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Button block onClick={finish} disabled={loading}>
          {loading ? 'Configurando…' : t.onboarding.finish}
        </Button>
      </div>
    </div>
  );
}
