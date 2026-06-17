# ctlmoney — Plan y avance

App PWA de finanzas personales. Stack: **Vite + React 18 + TypeScript (strict)**, backend en
**Google Apps Script** (Google Sheets como base de datos). Paleta **mostaza + negro**.

> Decisiones del cierre del prompt aplicadas: nombre = `ctlmoney`; paleta = amarillo mostaza
> (`#d4a017` claro / `#e8b923` oscuro) sobre negro (`#161513` / `#0e0e0e`). Reemplaza al
> nombre "Patrimonio" y a la paleta verde "Old Money" del cuerpo del documento.

---

## Plan por fases

| Fase | Contenido | Estado |
|------|-----------|--------|
| **1** | Fundación + auth Google + registro de movimientos (MVP usable) | 🟡 En curso |
| 2 | Presupuestos, recurrentes y multi-cuenta | ⬜ Pendiente |
| 3 | Analítica avanzada y metas | ⬜ Pendiente |
| 4 | Motor financiero, insights, seguridad y respaldo | ⬜ Pendiente |
| 5 | Importación CSV, comparación de periodos, base cero, etc. | ⬜ Pendiente |

Se ejecuta **una fase a la vez** y se detiene para validación del usuario.

---

## Avance Fase 1

### Hecho
- [x] Scaffold Vite + React + TS (strict), ESLint, Prettier, Vitest.
- [x] `vite-plugin-pwa` (Workbox): `NetworkFirst` para API de Apps Script, precache de assets.
      Meta tags iOS y manifest configurados.
- [x] Sistema de diseño: `tokens.css` + `tokens.ts` (mostaza + negro, claro y oscuro).
- [x] `core/money.ts` (enteros en centavos, redondeo bancario, parse/format) **+ 14 tests en verde**.
- [x] `core/result.ts`, `core/dates.ts` (date-fns locale es), `core/constants.ts`.
- [x] Cliente API `api/appsScript.ts`: retry con backoff (1s/2s/4s), timeout 10s, errores tipados,
      refresco de token ante 401. Endpoints por entidad y `api/types.ts`.
- [x] **Backend Apps Script completo de Fase 1** en `backend/`:
  - `Schema.gs` — esquema único de todas las hojas.
  - `Setup.gs` — **`initializeSpreadsheet()` idempotente: crea todas las hojas con sus
    encabezados automáticamente** + seed (19 categorías de sistema, cuenta "Efectivo", settings).
  - `Util.gs` — mapeo fila↔objeto, audit log, agregados en servidor.
  - `Auth.gs` — validación del ID token de Google (tokeninfo).
  - `IdempotencyStore.gs` — anti-duplicados con TTL 24h.
  - `Code.gs` — router `doPost`/`doGet`.
  - `Transactions.gs`, `Accounts.gs`, `Categories.gs`, `Settings.gs`.
  - `README.md` — pasos de despliegue.
- [x] Componentes base: `Button`, `Card`, `Skeleton`, `BottomSheet`, `Toaster`, `EmptyState`,
      `SegmentedControl`.
- [x] `i18n/es.ts` con todos los strings.
- [x] React Query (`queryClient`) y hooks `useCategories`, `useAccounts`.

### En curso / pendiente de Fase 1
- [ ] Hooks `useTransactions` (con optimistic update) y `useSettings`.
- [ ] Auth: Google Sign-In (`@react-oauth/google`), pantallas Login y Onboarding.
- [ ] Navegación + `AppShell` con tab bar y áreas seguras iOS.
- [ ] Pantallas: Registrar (teclado numérico custom), Inicio (dashboard), Movimientos, Más.
- [ ] `npm run build` + `lint` + `test` en verde.
- [ ] `DECISIONS.md` y reporte de cierre de Fase 1.

---

## Cómo correr

```bash
cp .env.example .env   # rellena VITE_GAS_ENDPOINT y VITE_GOOGLE_CLIENT_ID
npm install
npm run dev
npm run test           # tests unitarios (money.ts)
npm run build          # build de producción
```

Backend: ver `backend/README.md` (ejecutar `initializeSpreadsheet` una vez y desplegar como Web App).
