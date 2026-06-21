# ctlmoney — Plan y avance

App PWA de finanzas personales. Stack: **Vite + React 18 + TypeScript (strict)**, backend en
**Google Apps Script** (Google Sheets como base de datos). Paleta **mostaza + negro**.

---

## Estado actual — Junio 2026

### Pantallas implementadas

| Ruta | Pantalla | Estado |
|------|----------|--------|
| `/` | Inicio — balance neto, gráfica diaria, movimientos recientes, estado de tarjetas | ✅ |
| `/movimientos` | Movimientos — filtro por mes, búsqueda, editar/eliminar | ✅ |
| `/analisis` | Análisis — dona por categoría, top gastos | ✅ |
| `/mas` | Más — perfil, tema, moneda, cuentas, categorías, herramientas, exportar | ✅ |
| `/presupuestos` | Presupuestos — límites por categoría con barra de progreso | ✅ |
| `/recurrentes` | Recurrentes — reglas de gastos/ingresos periódicos | ✅ |
| `/metas` | Metas — objetivos de ahorro con progreso | ✅ |
| `/cuotas` | Cuotas sin interés — compras en cuotas con dona de progreso | ✅ |
| `/calculadoras` | Calculadoras financieras — 13 calculadoras en 3 grupos | ✅ |
| `/tarjetas` | Tarjetas de crédito — gestión de ciclo de pago y alertas | ✅ |
| `/ajedrez` | Tablero de ajedrez — juego contra IA básica | ✅ |

### Características transversales

- [x] Auth Google Sign-In + onboarding de cuenta inicial
- [x] PWA instalable (beforeinstallprompt) + notificación de actualización disponible
- [x] Tema claro/oscuro persistido
- [x] Multi-moneda (GTQ, USD, MXN, EUR)
- [x] Exportar datos: JSON, CSV, Excel (.xlsx), PDF
- [x] Registro de movimiento con edición (edit mode en el mismo form)
- [x] Categorías personalizadas (crear, editar, eliminar)
- [x] Efectos de sonido (`core/sfx.ts`) para acciones clave
- [x] Scroll nativo móvil (iOS Safari — position fixed en body)
- [x] z-index correcto: modales sobre tabBar
- [x] Carrusel horizontal de íconos en selector de categoría
- [x] Tarjetas de crédito con ciclo de pago y alertas en Home
- [x] Cron diario GAS para recurrentes (`installDailyTrigger`)

### Calculadoras (13 total)

**Finanzas personales:** Interés compuesto, Regla 50/30/20, Fondo de emergencia,
Costo real de deuda, Proyección de ahorro, ROI, Inflación

**Independencia financiera:** Número FIRE (regla 4%), Tasa de ahorro FIRE

**Negocios:** Punto de equilibrio, Margen de ganancia, Precio sugerido, Costo real empleado (Guatemala)

---

## Backend GAS

- Archivo principal: `backend/ctlmoney_backend.gs`
- Hojas: transactions, accounts, categories, settings, budgets, recurring_rules, goals, installments
- Funciones a ejecutar **una sola vez** desde el editor de GAS:
  - `migrateSchema(true)` — crea hoja `installments` si no existe
  - `installDailyTrigger()` — activa el cron diario para recurrentes

---

## Cómo correr

```bash
cp .env.example .env   # rellena VITE_GAS_ENDPOINT y VITE_GOOGLE_CLIENT_ID
npm install
npm run dev
npm run build
npm run test
```

Backend: ver `backend/README.md` (ejecutar `initializeSpreadsheet` una vez y desplegar como Web App).

---

## Pendientes / ideas futuras

- [ ] Tarjetas accesible desde sección Herramientas en Más
- [ ] Notificaciones push nativas para recurrentes y pagos de tarjeta
- [ ] Importación de movimientos vía CSV
- [ ] Comparación de periodos en Análisis
- [ ] Widget resumen en home screen (Android)
