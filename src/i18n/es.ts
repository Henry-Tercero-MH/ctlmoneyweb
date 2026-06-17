/** Todos los strings visibles al usuario. Sin literales hardcodeados en componentes. */

export const t = {
  appName: 'ctlmoney',

  auth: {
    tagline: 'Gestión patrimonial personal',
    continueGoogle: 'Continuar con Google',
    loading: 'Verificando sesión…',
    signOut: 'Cerrar sesión',
    notConfigured:
      'Falta configurar VITE_GOOGLE_CLIENT_ID y VITE_GAS_ENDPOINT en el archivo .env.',
  },

  onboarding: {
    title: 'Antes de empezar',
    backupWarning:
      'Tus datos viven en tu propia hoja de Google Sheets. Si pierdes acceso a tu cuenta de Google, perderás los datos. Exporta un respaldo regularmente.',
    chooseCurrency: 'Elige tu moneda',
    finish: 'Comenzar',
  },

  nav: {
    home: 'Inicio',
    movements: 'Movimientos',
    add: 'Agregar',
    analysis: 'Análisis',
    more: 'Más',
  },

  home: {
    netThisMonth: 'Balance neto del mes',
    income: 'Ingresos',
    expense: 'Gastos',
    dailySpend: 'Gasto diario (30 días)',
    recent: 'Últimos movimientos',
    seeAll: 'Ver todos',
    emptyTitle: 'Aún no hay movimientos este mes.',
    emptyAction: 'Registra tu primer gasto.',
  },

  movements: {
    title: 'Movimientos',
    search: 'Buscar por nota o categoría',
    emptyTitle: 'Sin movimientos en este periodo.',
    deleteConfirm: '¿Eliminar este movimiento?',
    delete: 'Eliminar',
    edit: 'Editar',
    cancel: 'Cancelar',
    dailyTotal: 'Total del día',
  },

  register: {
    title: 'Registrar movimiento',
    income: 'Ingreso',
    expense: 'Gasto',
    transfer: 'Transferencia',
    category: 'Categoría',
    account: 'Cuenta',
    accountTo: 'Cuenta destino',
    date: 'Fecha',
    note: 'Nota (opcional)',
    save: 'Guardar',
    saving: 'Guardando…',
    selectCategory: 'Selecciona una categoría',
    amountZero: 'Ingresa un monto mayor a cero.',
  },

  more: {
    title: 'Más',
    categories: 'Categorías',
    accounts: 'Cuentas',
    currency: 'Moneda',
    theme: 'Tema',
    themeLight: 'Claro',
    themeDark: 'Oscuro',
    backup: 'Respaldo',
    exportJson: 'Exportar JSON',
    exportCsv: 'Exportar CSV',
    addCategory: 'Nueva categoría',
    addAccount: 'Nueva cuenta',
    name: 'Nombre',
    type: 'Tipo',
    initialBalance: 'Saldo inicial',
  },

  accountTypes: {
    cash: 'Efectivo',
    bank: 'Banco',
    card: 'Tarjeta',
    savings: 'Ahorro',
    investment: 'Inversión',
  },

  common: {
    retry: 'Reintentar',
    save: 'Guardar',
    cancel: 'Cancelar',
    loadErrorTitle: 'No se pudo cargar',
    loadErrorBody: 'Verifica tu conexión e intenta de nuevo.',
    saveError: 'No se pudo guardar. Verifica tu conexión e intenta de nuevo.',
    deleted: 'Movimiento eliminado.',
    saved: 'Guardado.',
    comingSoon: 'Próximamente',
  },
} as const;
