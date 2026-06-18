import { Outlet, NavLink } from 'react-router-dom';
import { Home, List, PlusCircle, MoreHorizontal } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';
import { t } from '@/i18n/es';
import styles from './AppShell.module.css';

export function AppShell() {
  const openRegister = useUiStore((s) => s.openRegister);

  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.tabBar} role="navigation" aria-label="Navegación principal">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          aria-label={t.nav.home}
        >
          <Home size={22} strokeWidth={1.75} />
          <span className={styles.tabLabel}>{t.nav.home}</span>
        </NavLink>

        <NavLink
          to="/movimientos"
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          aria-label={t.nav.movements}
        >
          <List size={22} strokeWidth={1.75} />
          <span className={styles.tabLabel}>{t.nav.movements}</span>
        </NavLink>

        <button
          className={styles.addBtn}
          onClick={openRegister}
          aria-label={t.nav.add}
          type="button"
        >
          <PlusCircle size={28} strokeWidth={1.75} />
        </button>

        <NavLink
          to="/mas"
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          aria-label={t.nav.more}
        >
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span className={styles.tabLabel}>{t.nav.more}</span>
        </NavLink>
      </nav>
    </div>
  );
}
