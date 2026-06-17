/**
 * Schema.gs — Definición única del esquema de la base de datos (Google Sheets).
 * Cada hoja = tabla. La fila 1 es el encabezado fijo.
 * Setup.gs usa esta definición para crear/reparar las hojas automáticamente.
 */

// Orden de columnas POR HOJA. NO reordenar sin migrar datos existentes.
var SCHEMA = {
  accounts: [
    'id', 'name', 'type', 'initial_balance_minor', 'currency', 'archived', 'created_at',
  ],
  categories: [
    'id', 'name', 'kind', 'icon', 'color', 'parent_id', 'is_system', 'sort_order',
  ],
  transactions: [
    'id', 'account_id', 'category_id', 'kind', 'amount_minor', 'date', 'note',
    'transfer_account_id', 'recurring_id', 'idempotency_id', 'created_at', 'updated_at',
  ],
  budgets: [
    'id', 'category_id', 'period', 'limit_minor', 'start_month', 'active',
  ],
  recurring_rules: [
    'id', 'account_id', 'category_id', 'kind', 'amount_minor', 'note', 'frequency',
    'next_run_date', 'end_date', 'active',
  ],
  goals: [
    'id', 'name', 'target_minor', 'target_date', 'linked_account_id', 'created_at',
  ],
  settings: ['key', 'value'],
  audit_log: ['timestamp', 'action', 'entity', 'entity_id', 'payload_hash', 'user_email'],
  // Hoja interna para idempotencia (registro de IDs recientes).
  _idempotency: ['idempotency_id', 'created_at'],
};

// Columnas indexadas (rangos nombrados) para filtrado frecuente en el servidor.
var NAMED_RANGES = {
  transactions: ['date', 'category_id', 'account_id'],
};

/** Devuelve el índice de columna (0-based) de un campo en una hoja. */
function colIndex(sheetName, field) {
  var idx = SCHEMA[sheetName].indexOf(field);
  if (idx === -1) throw new Error('Campo desconocido ' + field + ' en ' + sheetName);
  return idx;
}
