/**
 * ctlmoney — Backend completo en un solo archivo Apps Script.
 *
 * DESPLIEGUE:
 *  1. Crea un Google Spreadsheet nuevo.
 *  2. Extensiones → Apps Script → borra el Code.gs por defecto.
 *  3. Pega TODO este archivo en Code.gs.
 *  4. Ejecuta `initializeSpreadsheet` una vez (▶ Ejecutar).
 *  5. Implementar → Nueva implementación → Aplicación web.
 *     - Ejecutar como: yo (el dueño).
 *     - Quién tiene acceso: cualquier usuario.
 *  6. Copia la URL /exec → VITE_GAS_ENDPOINT en tu .env.
 *
 * MODIFICAR:
 *  - Cada sección está delimitada con comentarios ── SECCIÓN ──
 *  - Para re-desplegar cambios: Implementar → Administrar implementaciones → editar versión.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA — Definición de hojas y columnas
// ─────────────────────────────────────────────────────────────────────────────

var SCHEMA = {
  accounts: [
    'id', 'name', 'type', 'initial_balance_minor', 'currency', 'archived', 'created_at',
  ],
  categories: [
    'id', 'name', 'kind', 'icon', 'color', 'parent_id', 'is_system', 'sort_order',
  ],
  transactions: [
    'id', 'account_id', 'category_id', 'kind', 'amount_minor', 'date', 'note',
    'transfer_account_id', 'recurring_id', 'idempotency_id', 'receipt_url', 'created_at', 'updated_at',
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
  installments: [
    'id', 'name', 'total_minor', 'installment_count', 'paid_count',
    'account_id', 'start_date', 'created_at',
  ],
  settings: ['key', 'value'],
  audit_log: ['timestamp', 'action', 'entity', 'entity_id', 'payload_hash', 'user_email'],
  _idempotency: ['idempotency_id', 'created_at'],
};

var NAMED_RANGES = {
  transactions: ['date', 'category_id', 'account_id'],
};

function colIndex(sheetName, field) {
  var idx = SCHEMA[sheetName].indexOf(field);
  if (idx === -1) throw new Error('Campo desconocido: ' + field + ' en ' + sheetName);
  return idx;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTIL — Helpers de acceso a hojas, errores y audit log
// ─────────────────────────────────────────────────────────────────────────────

function sheet_(name) {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!s) throw new Error('Hoja inexistente: ' + name + '. Ejecuta initializeSpreadsheet primero.');
  return s;
}

// Campos que deben serializarse como "YYYY-MM-DD" cuando Sheets los retorna como Date
var DATE_FIELDS = { date: true, target_date: true, next_run_date: true, end_date: true, start_month: true };
// Campos que deben ser "YYYY-MM-DDTHH:mm:ss.sssZ"
var DATETIME_FIELDS = { created_at: true, updated_at: true, timestamp: true };


function serializeCell_(field, value) {
  if (value instanceof Date) {
    if (DATE_FIELDS[field]) {
      // Solo fecha: "2025-06-17"
      var y = value.getFullYear();
      var mo = ('0' + (value.getMonth() + 1)).slice(-2);
      var d = ('0' + value.getDate()).slice(-2);
      return y + '-' + mo + '-' + d;
    }
    if (DATETIME_FIELDS[field]) return value.toISOString();
    return value.toISOString();
  }
  // Booleanos que Sheets guarda como strings "TRUE"/"FALSE"
  if (value === 'TRUE' || value === true) return true;
  if (value === 'FALSE' || value === false) return false;
  return value;
}

function readAll_(name) {
  var sheet = sheet_(name);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var headers = SCHEMA[name];
  var values = sheet.getRange(2, 1, last - 1, headers.length).getValues();
  return values.map(function (row) {
    var obj = {};
    for (var i = 0; i < headers.length; i++) {
      obj[headers[i]] = serializeCell_(headers[i], row[i]);
    }
    return obj;
  });
}

function findRowById_(name, id) {
  var sheet = sheet_(name);
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var idCol = colIndex(name, 'id') + 1;
  var ids = sheet.getRange(2, idCol, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function appendRow_(name, obj) {
  var sheet = sheet_(name);
  var row = SCHEMA[name].map(function (field) {
    return obj[field] !== undefined ? obj[field] : '';
  });
  sheet.appendRow(row);
  return obj;
}

function updateRow_(name, id, obj) {
  var rowNum = findRowById_(name, id);
  if (rowNum === -1) throw new ApiErr('NOT_FOUND', 'Registro no encontrado: ' + id);
  var sheet = sheet_(name);
  var row = SCHEMA[name].map(function (field) {
    return obj[field] !== undefined ? obj[field] : '';
  });
  sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
  return obj;
}

function deleteRow_(name, id) {
  var rowNum = findRowById_(name, id);
  if (rowNum === -1) throw new ApiErr('NOT_FOUND', 'Registro no encontrado: ' + id);
  sheet_(name).deleteRow(rowNum);
  return { id: id };
}

function ApiErr(code, message) {
  this.code = code;
  this.message = message;
}

function nowIso_() {
  return new Date().toISOString();
}

function audit_(action, entity, entityId, payload, email) {
  try {
    var hash = Utilities.base64Encode(
      Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(payload || {}))
    );
    sheet_('audit_log').appendRow([nowIso_(), action, entity, entityId, hash, email || '']);
  } catch (e) {
    // El audit no bloquea la operación principal.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — Validación del Google ID token
// ─────────────────────────────────────────────────────────────────────────────

// (Opcional) Fija aquí tu OAuth Client ID para verificar la audiencia del token.
// Si lo dejas vacío solo se valida que el token sea de Google y no esté expirado.
var ALLOWED_CLIENT_ID = '';

function verifyToken_(idToken) {
  if (!idToken) throw new ApiErr('AUTH_ERROR', 'Falta idToken.');

  var url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    // Segundo intento con access_token (el cliente puede enviar access_token en vez de id_token)
    var url2 = 'https://www.googleapis.com/oauth2/v3/userinfo';
    var res2 = UrlFetchApp.fetch(url2, {
      muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + idToken },
    });
    if (res2.getResponseCode() !== 200) {
      throw new ApiErr('AUTH_ERROR', 'Token inválido o expirado.');
    }
    var info2 = JSON.parse(res2.getContentText());
    return { email: info2.email, name: info2.name || info2.email };
  }

  var info = JSON.parse(res.getContentText());
  if (info.exp && Number(info.exp) * 1000 < Date.now()) {
    throw new ApiErr('AUTH_ERROR', 'Token expirado.');
  }
  if (ALLOWED_CLIENT_ID && info.aud !== ALLOWED_CLIENT_ID) {
    throw new ApiErr('AUTH_ERROR', 'Audiencia de token no autorizada.');
  }
  if (info.email_verified !== 'true' && info.email_verified !== true) {
    throw new ApiErr('AUTH_ERROR', 'Correo no verificado.');
  }
  return { email: info.email, name: info.name || info.email };
}

// ─────────────────────────────────────────────────────────────────────────────
// IDEMPOTENCY — Anti-duplicados (TTL 24h)
// ─────────────────────────────────────────────────────────────────────────────

var IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function checkAndStoreIdempotency_(idempotencyId) {
  if (!idempotencyId) return;
  var sheet = sheet_('_idempotency');
  var last = sheet.getLastRow();
  var now = Date.now();

  if (last >= 2) {
    var rows = sheet.getRange(2, 1, last - 1, 2).getValues();
    var expired = 0;
    for (var i = 0; i < rows.length; i++) {
      var id = String(rows[i][0]);
      var created = new Date(rows[i][1]).getTime();
      if (id === String(idempotencyId) && now - created < IDEMPOTENCY_TTL_MS) {
        throw new ApiErr('DUPLICATE_IDEMPOTENCY', 'Operación ya procesada.');
      }
      if (now - created >= IDEMPOTENCY_TTL_MS) expired++;
    }
    // Poda perezosa de entradas caducadas.
    if (expired > 0) sheet.deleteRows(2, expired);
  }

  sheet.appendRow([idempotencyId, nowIso_()]);
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP — Inicialización del Spreadsheet (idempotente)
// ─────────────────────────────────────────────────────────────────────────────

function initializeSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var created = [];

  Object.keys(SCHEMA).forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      created.push(sheetName);
    }
    writeHeaders_(sheet, SCHEMA[sheetName]);
  });

  setupNamedRanges_(ss);
  seedCategories_(ss);
  seedDefaultAccount_(ss);
  seedDefaultSettings_(ss);
  removeDefaultSheet_(ss);

  return { created: created };
}

/**
 * Mapa de seeds por hoja. Cada entrada es una función que recibe el Spreadsheet
 * y escribe datos iniciales SOLO si la hoja está vacía (lastRow === 1).
 *
 * Para agregar seed a una hoja nueva en el futuro, basta con añadir una entrada aquí
 * con el mismo nombre que la hoja en SCHEMA. No hay que tocar migrateSchema().
 */
var SEEDS = {
  categories:     function(ss) { seedCategories_(ss); },
  accounts:       function(ss) { seedDefaultAccount_(ss); },
  settings:       function(ss) { seedDefaultSettings_(ss); },
  budgets:        function(ss) { seedBudgets_(ss); },
  recurring_rules:function(ss) { seedRecurringRules_(ss); },
  goals:          function(ss) { seedGoals_(ss); },
  installments:   function(ss) { seedInstallments_(ss); },
};

/**
 * Compara el SCHEMA actual contra el Spreadsheet y aplica solo los cambios necesarios:
 *  - Crea hojas que existen en SCHEMA pero no en el Spreadsheet.
 *  - En hojas existentes, agrega al final las columnas que le falten según SCHEMA.
 *  - No elimina ni reordena columnas — los datos existentes quedan intactos.
 *  - Si seed=true, ejecuta el seed de cada hoja nueva creada (solo si está vacía).
 *
 * Uso: ejecútala desde el editor cuando agregues una hoja o campo nuevo al SCHEMA.
 * Desde el router: { action: 'migrateSchema', payload: { seed: true } }
 *
 * Devuelve un reporte: { sheetsCreated, columnsAdded, seeded }
 */
function migrateSchema(seed) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetsCreated = [];
  var columnsAdded = [];
  var seeded = [];

  Object.keys(SCHEMA).forEach(function (sheetName) {
    var expectedHeaders = SCHEMA[sheetName];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      writeHeaders_(sheet, expectedHeaders);
      sheetsCreated.push(sheetName);

      // Seed opcional en hoja recién creada
      if (seed && SEEDS[sheetName]) {
        SEEDS[sheetName](ss);
        seeded.push(sheetName);
      }
      return;
    }

    // Hoja existente: leer los headers actuales de la fila 1
    var lastCol = sheet.getLastColumn();
    var currentHeaders = lastCol > 0
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String)
      : [];

    // Detectar qué campos del SCHEMA no existen todavía
    var missing = expectedHeaders.filter(function (field) {
      return currentHeaders.indexOf(field) === -1;
    });

    if (missing.length === 0) return;

    // Agregar cada columna faltante al final
    missing.forEach(function (field) {
      var newCol = sheet.getLastColumn() + 1;
      var headerCell = sheet.getRange(1, newCol);
      headerCell.setValue(field);
      headerCell.setFontWeight('bold');
      headerCell.setBackground('#161513');
      headerCell.setFontColor('#e8b923');

      if (field.indexOf('_minor') !== -1) {
        sheet.getRange(2, newCol, sheet.getMaxRows() - 1, 1).setNumberFormat('0');
      }

      columnsAdded.push(sheetName + '.' + field);
    });
  });

  setupNamedRanges_(ss);

  var report = { sheetsCreated: sheetsCreated, columnsAdded: columnsAdded, seeded: seeded };
  Logger.log('migrateSchema: ' + JSON.stringify(report));
  return report;
}

// Seeds vacíos para hojas de Fase 2/3/4
function seedBudgets_(ss) { /* sin datos iniciales */ }
function seedRecurringRules_(ss) { /* sin datos iniciales */ }
function seedGoals_(ss) { /* sin datos iniciales */ }
function seedInstallments_(ss) { /* sin datos iniciales */ }

function writeHeaders_(sheet, headers) {
  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold');
  range.setBackground('#161513');
  range.setFontColor('#e8b923');
  sheet.setFrozenRows(1);
  ensureIntegerColumns_(sheet, headers);
}

function ensureIntegerColumns_(sheet, headers) {
  for (var i = 0; i < headers.length; i++) {
    if (headers[i].indexOf('_minor') !== -1) {
      sheet.getRange(2, i + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('0');
    }
  }
}

function setupNamedRanges_(ss) {
  Object.keys(NAMED_RANGES).forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    NAMED_RANGES[sheetName].forEach(function (field) {
      var col = colIndex(sheetName, field) + 1;
      var name = sheetName + '_' + field + '_idx';
      var range = sheet.getRange(2, col, sheet.getMaxRows() - 1, 1);
      try { ss.setNamedRange(name, range); } catch (e) {}
    });
  });
}

function seedCategories_(ss) {
  var sheet = ss.getSheetByName('categories');
  if (sheet.getLastRow() > 1) return;
  // Los slugs de icon deben coincidir exactamente con ICON_MAP del frontend (CategoryIcon.tsx)
  var cats = [
    { name: 'Vivienda',        kind: 'expense', icon: 'vivienda',        color: '#d4a017' },
    { name: 'Alimentación',    kind: 'expense', icon: 'alimentacion',    color: '#d4a017' },
    { name: 'Transporte',      kind: 'expense', icon: 'transporte',      color: '#d4a017' },
    { name: 'Salud',           kind: 'expense', icon: 'salud',           color: '#d4a017' },
    { name: 'Educación',       kind: 'expense', icon: 'educacion',       color: '#d4a017' },
    { name: 'Deudas',          kind: 'expense', icon: 'deudas',          color: '#d4a017' },
    { name: 'Entretenimiento', kind: 'expense', icon: 'entretenimiento', color: '#d4a017' },
    { name: 'Ropa',            kind: 'expense', icon: 'ropa',            color: '#d4a017' },
    { name: 'Servicios',       kind: 'expense', icon: 'servicios',       color: '#d4a017' },
    { name: 'Suscripciones',   kind: 'expense', icon: 'suscripciones',   color: '#d4a017' },
    { name: 'Regalos',         kind: 'expense', icon: 'regalos',         color: '#d4a017' },
    { name: 'Mascotas',        kind: 'expense', icon: 'mascotas',        color: '#d4a017' },
    { name: 'Imprevistos',     kind: 'expense', icon: 'imprevistos',     color: '#d4a017' },
    { name: 'Otros',           kind: 'expense', icon: 'otros',           color: '#d4a017' },
    { name: 'Salario',         kind: 'income',  icon: 'salario',         color: '#3f7a3a' },
    { name: 'Negocio',         kind: 'income',  icon: 'negocio',         color: '#3f7a3a' },
    { name: 'Freelance',       kind: 'income',  icon: 'freelance',       color: '#3f7a3a' },
    { name: 'Inversiones',     kind: 'income',  icon: 'inversiones',     color: '#3f7a3a' },
    { name: 'Otros ingresos',  kind: 'income',  icon: 'otros-ingresos',  color: '#3f7a3a' },
  ];
  var rows = cats.map(function (c, i) {
    return [Utilities.getUuid(), c.name, c.kind, c.icon, c.color, '', true, i];
  });
  sheet.getRange(2, 1, rows.length, SCHEMA.categories.length).setValues(rows);
}

function seedDefaultAccount_(ss) {
  var sheet = ss.getSheetByName('accounts');
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, 1, SCHEMA.accounts.length).setValues([
    [Utilities.getUuid(), 'Efectivo', 'cash', 0, 'GTQ', false, new Date().toISOString()],
  ]);
}

function seedDefaultSettings_(ss) {
  var sheet = ss.getSheetByName('settings');
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, 4, 2).setValues([
    ['active_currency', 'GTQ'],
    ['theme', 'light'],
    ['onboarding_complete', 'false'],
    ['timezone', Session.getScriptTimeZone()],
  ]);
}

function removeDefaultSheet_(ss) {
  ['Sheet1', 'Hoja 1', 'Hoja1'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 1 && s.getLastRow() <= 1) {
      try { ss.deleteSheet(s); } catch (e) {}
    }
  });
}

function slugIcon_(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS — CRUD + resumen del mes
// ─────────────────────────────────────────────────────────────────────────────

function listTransactions_(payload) {
  var all = readAll_('transactions');
  var ym = payload.yearMonth;
  var accountId = payload.accountId;
  var categoryId = payload.categoryId;
  var search = payload.search ? String(payload.search).toLowerCase() : '';

  var rows = all.filter(function (t) {
    if (ym && String(t.date).slice(0, 7) !== ym) return false;
    if (accountId && t.account_id !== accountId) return false;
    if (categoryId && t.category_id !== categoryId) return false;
    if (search && String(t.note).toLowerCase().indexOf(search) === -1) return false;
    return true;
  });

  rows.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  return rows;
}

function getTransactionSummary_(payload) {
  var ym = payload.yearMonth;
  var rows = readAll_('transactions').filter(function (t) {
    return String(t.date).slice(0, 7) === ym && t.kind !== 'transfer';
  });

  var income = 0, expense = 0, byCat = {}, daily = {};
  rows.forEach(function (t) {
    var amt = Number(t.amount_minor) || 0;
    if (t.kind === 'income') income += amt; else expense += amt;
    if (t.kind === 'expense') byCat[t.category_id] = (byCat[t.category_id] || 0) + amt;
    var d = String(t.date);
    if (!daily[d]) daily[d] = { date: d, expense_minor: 0, income_minor: 0 };
    if (t.kind === 'income') daily[d].income_minor += amt; else daily[d].expense_minor += amt;
  });

  return {
    yearMonth: ym,
    income_minor: income,
    expense_minor: expense,
    net_minor: income - expense,
    by_category: Object.keys(byCat).map(function (cid) {
      return { category_id: cid, amount_minor: byCat[cid] };
    }),
    daily: Object.keys(daily).map(function (k) { return daily[k]; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); }),
  };
}

function createTransaction_(payload, user) {
  validateTransaction_(payload);
  var now = nowIso_();
  if (payload.kind === 'transfer') {
    if (!payload.transfer_account_id) {
      throw new ApiErr('VALIDATION_ERROR', 'Transferencia requiere cuenta destino.');
    }
    var debit = buildTxn_(payload, now, payload.account_id, payload.transfer_account_id);
    var credit = buildTxn_(payload, now, payload.transfer_account_id, payload.account_id);
    credit.id = payload.id + '-credit';
    appendRow_('transactions', debit);
    appendRow_('transactions', credit);
    audit_('createTransaction', 'transactions', payload.id, payload, user.email);
    return debit;
  }
  var txn = buildTxn_(payload, now, payload.account_id, '');
  appendRow_('transactions', txn);
  audit_('createTransaction', 'transactions', txn.id, payload, user.email);
  return txn;
}

function buildTxn_(payload, now, accountId, transferAccountId) {
  return {
    id: payload.id,
    account_id: accountId,
    category_id: payload.category_id || '',
    kind: payload.kind,
    amount_minor: Math.round(Number(payload.amount_minor)),
    date: payload.date,
    note: payload.note || '',
    transfer_account_id: transferAccountId,
    recurring_id: payload.recurring_id || '',
    idempotency_id: payload.idempotency_id || '',
    receipt_url: payload.receipt_url || '',
    created_at: now,
    updated_at: now,
  };
}

function updateTransaction_(payload, user) {
  validateTransaction_(payload);
  var existing = readAll_('transactions').filter(function (t) { return t.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Transacción no encontrada.');
  var txn = buildTxn_(payload, existing.created_at || nowIso_(), payload.account_id, payload.transfer_account_id || '');
  txn.updated_at = nowIso_();
  updateRow_('transactions', payload.id, txn);
  audit_('updateTransaction', 'transactions', payload.id, payload, user.email);
  return txn;
}

function deleteTransaction_(payload, user) {
  var res = deleteRow_('transactions', payload.id);
  var creditId = payload.id + '-credit';
  if (findRowById_('transactions', creditId) !== -1) deleteRow_('transactions', creditId);
  audit_('deleteTransaction', 'transactions', payload.id, payload, user.email);
  return res;
}

function validateTransaction_(p) {
  if (!p.id) throw new ApiErr('VALIDATION_ERROR', 'Falta id.');
  if (['income', 'expense', 'transfer'].indexOf(p.kind) === -1) {
    throw new ApiErr('VALIDATION_ERROR', 'kind inválido: ' + p.kind);
  }
  if (!Number.isFinite(Number(p.amount_minor)) || Number(p.amount_minor) <= 0) {
    throw new ApiErr('VALIDATION_ERROR', 'Monto inválido.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date))) {
    throw new ApiErr('VALIDATION_ERROR', 'Fecha inválida (YYYY-MM-DD).');
  }
  if (!p.account_id) throw new ApiErr('VALIDATION_ERROR', 'Falta cuenta.');
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTS — CRUD + balances calculados en servidor
// ─────────────────────────────────────────────────────────────────────────────

function listAccounts_() {
  return readAll_('accounts').filter(function (a) {
    // serializeCell_ ya convierte "TRUE"/"FALSE" a boolean — solo comparar con true
    return a.archived !== true;
  });
}

function getAccountBalances_() {
  var accounts = readAll_('accounts');
  var txns = readAll_('transactions');
  var map = {};
  // Inicializar con saldo inicial (todas las cuentas, incluso archivadas)
  accounts.forEach(function (a) { map[a.id] = Number(a.initial_balance_minor) || 0; });
  txns.forEach(function (t) {
    var amt = Number(t.amount_minor) || 0;
    // Cuenta origen
    if (map[t.account_id] !== undefined) {
      if (t.kind === 'income')   map[t.account_id] += amt;
      else if (t.kind === 'expense')  map[t.account_id] -= amt;
      else if (t.kind === 'transfer') map[t.account_id] -= amt;
    }
    // Cuenta destino en transferencia recibe el monto
    if (t.kind === 'transfer' && t.transfer_account_id && map[t.transfer_account_id] !== undefined) {
      map[t.transfer_account_id] += amt;
    }
  });
  return Object.keys(map).map(function (id) {
    return { account_id: id, balance_minor: map[id] };
  });
}

function createAccount_(payload, user) {
  if (!payload.id || !payload.name) throw new ApiErr('VALIDATION_ERROR', 'Datos de cuenta incompletos.');
  var row = {
    id: payload.id,
    name: payload.name,
    type: payload.type || 'cash',
    initial_balance_minor: Math.round(Number(payload.initial_balance_minor) || 0),
    currency: payload.currency || 'GTQ',
    archived: false,
    created_at: nowIso_(),
  };
  appendRow_('accounts', row);
  audit_('createAccount', 'accounts', row.id, payload, user.email);
  return row;
}

function updateAccount_(payload, user) {
  var existing = readAll_('accounts').filter(function (a) { return a.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Cuenta no encontrada.');
  var row = {
    id: payload.id,
    name: payload.name,
    type: payload.type,
    initial_balance_minor: Math.round(Number(payload.initial_balance_minor) || 0),
    currency: payload.currency,
    archived: existing.archived,
    created_at: existing.created_at,
  };
  updateRow_('accounts', payload.id, row);
  audit_('updateAccount', 'accounts', payload.id, payload, user.email);
  return row;
}

function archiveAccount_(payload, user) {
  var existing = readAll_('accounts').filter(function (a) { return a.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Cuenta no encontrada.');
  existing.archived = true;
  updateRow_('accounts', payload.id, existing);
  audit_('archiveAccount', 'accounts', payload.id, payload, user.email);
  return { id: payload.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES — CRUD
// ─────────────────────────────────────────────────────────────────────────────

function listCategories_() {
  return readAll_('categories').sort(function (a, b) {
    return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
  });
}

function createCategory_(payload, user) {
  if (!payload.id || !payload.name) throw new ApiErr('VALIDATION_ERROR', 'Datos de categoría incompletos.');
  if (['income', 'expense'].indexOf(payload.kind) === -1) {
    throw new ApiErr('VALIDATION_ERROR', 'kind inválido.');
  }
  var row = {
    id: payload.id,
    name: payload.name,
    kind: payload.kind,
    icon: payload.icon || 'tag',
    color: payload.color || '#d4a017',
    parent_id: payload.parent_id || '',
    is_system: false,
    sort_order: Number(payload.sort_order) || 999,
  };
  appendRow_('categories', row);
  audit_('createCategory', 'categories', row.id, payload, user.email);
  return row;
}

function updateCategory_(payload, user) {
  var existing = readAll_('categories').filter(function (c) { return c.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Categoría no encontrada.');
  var row = {
    id: payload.id,
    name: payload.name,
    kind: payload.kind || existing.kind,
    icon: payload.icon || existing.icon,
    color: payload.color || existing.color,
    parent_id: payload.parent_id || '',
    is_system: existing.is_system,
    sort_order: Number(payload.sort_order) || existing.sort_order,
  };
  updateRow_('categories', payload.id, row);
  audit_('updateCategory', 'categories', payload.id, payload, user.email);
  return row;
}

function deleteCategory_(payload, user) {
  var existing = readAll_('categories').filter(function (c) { return c.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Categoría no encontrada.');
  if (existing.is_system === true || existing.is_system === 'TRUE') {
    throw new ApiErr('VALIDATION_ERROR', 'No se puede eliminar una categoría de sistema.');
  }
  var inUse = readAll_('transactions').some(function (t) { return t.category_id === payload.id; });
  if (inUse) throw new ApiErr('VALIDATION_ERROR', 'La categoría tiene movimientos asociados.');
  deleteRow_('categories', payload.id);
  audit_('deleteCategory', 'categories', payload.id, payload, user.email);
  return { id: payload.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS — clave/valor de configuración
// ─────────────────────────────────────────────────────────────────────────────

function getAllSettings_() {
  var rows = readAll_('settings');
  var out = {};
  rows.forEach(function (r) { out[r.key] = String(r.value); });
  return out;
}

function setSetting_(payload, user) {
  if (!payload.key) throw new ApiErr('VALIDATION_ERROR', 'Falta key.');
  var sheet = sheet_('settings');
  var last = sheet.getLastRow();
  if (last >= 2) {
    var keys = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === String(payload.key)) {
        sheet.getRange(i + 2, 2).setValue(String(payload.value));
        audit_('setSetting', 'settings', payload.key, payload, user.email);
        return { key: payload.key };
      }
    }
  }
  sheet.appendRow([payload.key, String(payload.value)]);
  audit_('setSetting', 'settings', payload.key, payload, user.email);
  return { key: payload.key };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUDGETS — CRUD de presupuestos por categoría
// ─────────────────────────────────────────────────────────────────────────────

function listBudgets_() {
  // serializeCell_ ya normaliza active a boolean — solo comparar con false
  return readAll_('budgets').filter(function (b) { return b.active !== false; });
}

function createBudget_(payload, user) {
  if (!payload.id || !payload.category_id) throw new ApiErr('VALIDATION_ERROR', 'Datos de presupuesto incompletos.');
  if (!Number.isFinite(Number(payload.limit_minor)) || Number(payload.limit_minor) <= 0) {
    throw new ApiErr('VALIDATION_ERROR', 'Límite inválido.');
  }
  var row = {
    id: payload.id,
    category_id: payload.category_id,
    period: payload.period || 'monthly',
    limit_minor: Math.round(Number(payload.limit_minor)),
    start_month: payload.start_month || nowIso_().slice(0, 7),
    active: true,
  };
  appendRow_('budgets', row);
  audit_('createBudget', 'budgets', row.id, payload, user.email);
  return row;
}

function updateBudget_(payload, user) {
  var existing = readAll_('budgets').filter(function (b) { return b.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Presupuesto no encontrado.');
  var row = {
    id: payload.id,
    category_id: payload.category_id || existing.category_id,
    period: payload.period || existing.period,
    limit_minor: Math.round(Number(payload.limit_minor) || existing.limit_minor),
    start_month: payload.start_month || existing.start_month,
    active: payload.active !== undefined ? payload.active : existing.active,
  };
  updateRow_('budgets', payload.id, row);
  audit_('updateBudget', 'budgets', payload.id, payload, user.email);
  return row;
}

function deleteBudget_(payload, user) {
  var res = deleteRow_('budgets', payload.id);
  audit_('deleteBudget', 'budgets', payload.id, payload, user.email);
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURRING RULES — CRUD de reglas de transacciones recurrentes
// ─────────────────────────────────────────────────────────────────────────────

function listRecurringRules_() {
  return readAll_('recurring_rules');
}

function createRecurringRule_(payload, user) {
  if (!payload.id || !payload.account_id || !payload.category_id) {
    throw new ApiErr('VALIDATION_ERROR', 'Datos de regla recurrente incompletos.');
  }
  if (!Number.isFinite(Number(payload.amount_minor)) || Number(payload.amount_minor) <= 0) {
    throw new ApiErr('VALIDATION_ERROR', 'Monto inválido.');
  }
  var validFreqs = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];
  if (validFreqs.indexOf(payload.frequency) === -1) {
    throw new ApiErr('VALIDATION_ERROR', 'Frecuencia inválida: ' + payload.frequency);
  }
  var row = {
    id: payload.id,
    account_id: payload.account_id,
    category_id: payload.category_id,
    kind: payload.kind || 'expense',
    amount_minor: Math.round(Number(payload.amount_minor)),
    note: payload.note || '',
    frequency: payload.frequency,
    next_run_date: payload.next_run_date || nowIso_().slice(0, 10),
    end_date: payload.end_date || '',
    active: true,
  };
  appendRow_('recurring_rules', row);
  audit_('createRecurringRule', 'recurring_rules', row.id, payload, user.email);
  return row;
}

function updateRecurringRule_(payload, user) {
  var existing = readAll_('recurring_rules').filter(function (r) { return r.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Regla recurrente no encontrada.');
  var row = {
    id: payload.id,
    account_id: payload.account_id || existing.account_id,
    category_id: payload.category_id || existing.category_id,
    kind: payload.kind || existing.kind,
    amount_minor: Math.round(Number(payload.amount_minor) || existing.amount_minor),
    note: payload.note !== undefined ? payload.note : existing.note,
    frequency: payload.frequency || existing.frequency,
    next_run_date: payload.next_run_date || existing.next_run_date,
    end_date: payload.end_date !== undefined ? payload.end_date : existing.end_date,
    active: payload.active !== undefined ? payload.active : existing.active,
  };
  updateRow_('recurring_rules', payload.id, row);
  audit_('updateRecurringRule', 'recurring_rules', payload.id, payload, user.email);
  return row;
}

function deleteRecurringRule_(payload, user) {
  var res = deleteRow_('recurring_rules', payload.id);
  audit_('deleteRecurringRule', 'recurring_rules', payload.id, payload, user.email);
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// GOALS — Metas de ahorro
// ─────────────────────────────────────────────────────────────────────────────

function listGoals_() {
  return readAll_('goals');
}

function createGoal_(payload, user) {
  if (!payload.id)   throw new ApiErr('VALIDATION_ERROR', 'Falta id.');
  if (!payload.name) throw new ApiErr('VALIDATION_ERROR', 'Falta nombre.');
  if (!Number.isFinite(Number(payload.target_minor)) || Number(payload.target_minor) <= 0) {
    throw new ApiErr('VALIDATION_ERROR', 'Monto objetivo inválido.');
  }
  var row = {
    id: payload.id,
    name: String(payload.name).trim(),
    target_minor: Math.round(Number(payload.target_minor)),
    target_date: payload.target_date || '',
    linked_account_id: payload.linked_account_id || '',
    created_at: nowIso_(),
  };
  appendRow_('goals', row);
  audit_('createGoal', 'goals', row.id, payload, user.email);
  return row;
}

function updateGoal_(payload, user) {
  if (!payload.id) throw new ApiErr('VALIDATION_ERROR', 'Falta id.');
  var existing = readAll_('goals').filter(function(g) { return g.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Meta no encontrada.');
  var row = {
    id: payload.id,
    name: String(payload.name || existing.name).trim(),
    target_minor: Math.round(Number(payload.target_minor) || existing.target_minor),
    target_date: payload.target_date !== undefined ? payload.target_date : existing.target_date,
    linked_account_id: payload.linked_account_id !== undefined
      ? payload.linked_account_id : existing.linked_account_id,
    created_at: existing.created_at || nowIso_(),
  };
  updateRow_('goals', payload.id, row);
  audit_('updateGoal', 'goals', payload.id, payload, user.email);
  return row;
}

function deleteGoal_(payload, user) {
  var res = deleteRow_('goals', payload.id);
  audit_('deleteGoal', 'goals', payload.id, payload, user.email);
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTALLMENTS — Compras en cuotas sin interés
// ─────────────────────────────────────────────────────────────────────────────

function listInstallments_() {
  return readAll_('installments');
}

function createInstallment_(payload, user) {
  if (!payload.id || !payload.name) throw new ApiErr('VALIDATION_ERROR', 'Faltan datos.');
  if (!Number.isFinite(Number(payload.total_minor)) || Number(payload.total_minor) <= 0)
    throw new ApiErr('VALIDATION_ERROR', 'Monto inválido.');
  var count = Math.round(Number(payload.installment_count));
  if (!count || count < 1) throw new ApiErr('VALIDATION_ERROR', 'Número de cuotas inválido.');
  var row = {
    id: payload.id,
    name: String(payload.name).trim(),
    total_minor: Math.round(Number(payload.total_minor)),
    installment_count: count,
    paid_count: 0,
    account_id: payload.account_id || '',
    start_date: payload.start_date || nowIso_().slice(0, 10),
    created_at: nowIso_(),
  };
  appendRow_('installments', row);
  audit_('createInstallment', 'installments', row.id, payload, user.email);
  return row;
}

function updateInstallment_(payload, user) {
  if (!payload.id) throw new ApiErr('VALIDATION_ERROR', 'Falta id.');
  var existing = readAll_('installments').filter(function(r) { return r.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Cuota no encontrada.');
  var row = {
    id: payload.id,
    name: String(payload.name || existing.name).trim(),
    total_minor: Math.round(Number(payload.total_minor) || existing.total_minor),
    installment_count: Math.round(Number(payload.installment_count) || existing.installment_count),
    paid_count: Math.max(0, Math.round(Number(payload.paid_count !== undefined ? payload.paid_count : existing.paid_count))),
    account_id: payload.account_id !== undefined ? payload.account_id : existing.account_id,
    start_date: payload.start_date || existing.start_date,
    created_at: existing.created_at,
  };
  updateRow_('installments', payload.id, row);
  audit_('updateInstallment', 'installments', payload.id, payload, user.email);
  return row;
}

function deleteInstallment_(payload, user) {
  var res = deleteRow_('installments', payload.id);
  audit_('deleteInstallment', 'installments', payload.id, payload, user.email);
  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT — Volcado completo de datos
// ─────────────────────────────────────────────────────────────────────────────

function exportData_(payload) {
  var format = payload && payload.format === 'csv' ? 'csv' : 'json';
  var sheets = ['accounts', 'categories', 'transactions', 'budgets', 'recurring_rules', 'goals', 'installments'];

  if (format === 'json') {
    var out = { exported_at: nowIso_(), version: 1, data: {} };
    sheets.forEach(function (s) { out.data[s] = readAll_(s); });
    return out;
  }

  // CSV: devuelve un objeto { sheets: { name: csvString } }
  var csvOut = { exported_at: nowIso_(), sheets: {} };
  sheets.forEach(function (name) {
    var headers = SCHEMA[name];
    var rows = readAll_(name);
    var lines = [headers.join(',')];
    rows.forEach(function (row) {
      var cells = headers.map(function (h) {
        var v = row[h];
        if (v === null || v === undefined) return '';
        var s = String(v).replace(/"/g, '""');
        return s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1
          ? '"' + s + '"' : s;
      });
      lines.push(cells.join(','));
    });
    csvOut.sheets[name] = lines.join('\n');
  });
  return csvOut;
}

// ─────────────────────────────────────────────────────────────────────────────
// RECURRING TRIGGER — Generación automática de movimientos recurrentes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Punto de entrada del trigger diario.
 * Configurar en Apps Script: Triggers → Agregar trigger → processDailyRecurring
 * Tipo: Time-driven → Day timer → cualquier hora.
 */
function processDailyRecurring() {
  var today = nowIso_().slice(0, 10); // YYYY-MM-DD
  var rules = readAll_('recurring_rules').filter(function (r) {
    return r.active !== false && r.next_run_date && r.next_run_date <= today;
  });

  var generated = [];
  rules.forEach(function (rule) {
    // Verificar fecha de fin
    if (rule.end_date && rule.end_date < today) {
      // Desactivar regla vencida
      rule.active = false;
      updateRow_('recurring_rules', rule.id, rule);
      return;
    }

    // Generar transacción
    var txId = Utilities.getUuid();
    var txn = {
      id: txId,
      account_id: rule.account_id,
      category_id: rule.category_id,
      kind: rule.kind,
      amount_minor: Number(rule.amount_minor),
      date: rule.next_run_date,
      note: rule.note || '',
      transfer_account_id: '',
      recurring_id: rule.id,
      idempotency_id: rule.id + '-' + rule.next_run_date,
      receipt_url: '',
      created_at: nowIso_(),
      updated_at: nowIso_(),
    };

    // Evitar duplicados por idempotency_id
    var existing = readAll_('transactions').some(function (t) {
      return t.idempotency_id === txn.idempotency_id;
    });
    if (!existing) {
      appendRow_('transactions', txn);
      generated.push(txId);
    }

    // Calcular próxima fecha
    rule.next_run_date = nextRunDate_(rule.next_run_date, rule.frequency);
    updateRow_('recurring_rules', rule.id, rule);
  });

  Logger.log('processDailyRecurring: ' + generated.length + ' transacciones generadas.');
  return { generated: generated.length, date: today };
}

/**
 * Instala el trigger diario automáticamente (ejecutar una vez desde el editor).
 * Si ya existe, no duplica.
 */
function installDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processDailyRecurring') {
      Logger.log('Trigger ya existe.');
      return;
    }
  }
  ScriptApp.newTrigger('processDailyRecurring')
    .timeBased()
    .everyDays(1)
    .atHour(7) // 7 AM zona horaria del script
    .create();
  Logger.log('Trigger diario instalado.');
}

function nextRunDate_(dateStr, frequency) {
  var parts = dateStr.split('-');
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10) - 1; // 0-indexed
  var d = parseInt(parts[2], 10);
  var dt = new Date(y, m, d);

  switch (frequency) {
    case 'daily':     dt.setDate(dt.getDate() + 1);   break;
    case 'weekly':    dt.setDate(dt.getDate() + 7);   break;
    case 'biweekly':  dt.setDate(dt.getDate() + 14);  break;
    case 'monthly':   dt.setMonth(dt.getMonth() + 1); break;
    case 'yearly':    dt.setFullYear(dt.getFullYear() + 1); break;
    default:          dt.setMonth(dt.getMonth() + 1); break;
  }

  var ny = dt.getFullYear();
  var nm = ('0' + (dt.getMonth() + 1)).slice(-2);
  var nd = ('0' + dt.getDate()).slice(-2);
  return ny + '-' + nm + '-' + nd;
}

// ─────────────────────────────────────────────────────────────────────────────
// DRIVE — Subida de imágenes a Google Drive
// ─────────────────────────────────────────────────────────────────────────────

// Nombre de la carpeta raíz en el Drive del propietario del script.
var DRIVE_FOLDER_NAME = 'ctlmoney';

/**
 * Devuelve (o crea) una subcarpeta dentro de la carpeta raíz de ctlmoney.
 * Ejemplo: getFolder_('receipts') → Drive/ctlmoney/receipts/
 */
function getFolder_(subfolderName) {
  var root;
  var roots = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  root = roots.hasNext() ? roots.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);

  var subs = root.getFoldersByName(subfolderName);
  return subs.hasNext() ? subs.next() : root.createFolder(subfolderName);
}

/**
 * Decodifica base64, sube el archivo a Drive y devuelve la URL pública de vista.
 * mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
 */
function saveToDrive_(base64Data, fileName, mimeType, folder) {
  // Eliminar cabecera data URI si viene incluida ("data:image/jpeg;base64,...")
  var clean = base64Data.replace(/^data:[^;]+;base64,/, '');
  var blob = Utilities.newBlob(Utilities.base64Decode(clean), mimeType, fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  // URL de vista previa directa (no descarga)
  return 'https://drive.google.com/uc?id=' + file.getId() + '&export=view';
}

/**
 * Sube el recibo de una transacción y actualiza receipt_url en la hoja.
 *
 * payload: {
 *   transactionId: string,   // id de la transacción a vincular
 *   base64: string,          // imagen en base64 (con o sin cabecera data URI)
 *   mimeType: string,        // 'image/jpeg' | 'image/png' | 'image/webp'
 * }
 */
function uploadReceipt_(payload, user) {
  if (!payload.transactionId) throw new ApiErr('VALIDATION_ERROR', 'Falta transactionId.');
  if (!payload.base64)        throw new ApiErr('VALIDATION_ERROR', 'Falta base64.');

  var mime = payload.mimeType || 'image/jpeg';
  var ext  = mime.split('/')[1] || 'jpg';
  var fileName = 'receipt_' + payload.transactionId + '_' + Date.now() + '.' + ext;

  var folder = getFolder_('receipts');
  var url = saveToDrive_(payload.base64, fileName, mime, folder);

  // Actualizar receipt_url en la transacción existente
  var rowNum = findRowById_('transactions', payload.transactionId);
  if (rowNum !== -1) {
    var col = colIndex('transactions', 'receipt_url') + 1;
    sheet_('transactions').getRange(rowNum, col).setValue(url);
  }

  audit_('uploadReceipt', 'transactions', payload.transactionId, { url: url }, user.email);
  return { transactionId: payload.transactionId, receipt_url: url };
}

/**
 * Sube o reemplaza la foto de perfil del usuario y guarda la URL en settings.
 *
 * payload: {
 *   base64: string,
 *   mimeType: string,
 * }
 */
function uploadAvatar_(payload, user) {
  if (!payload.base64) throw new ApiErr('VALIDATION_ERROR', 'Falta base64.');

  var mime = payload.mimeType || 'image/jpeg';
  var ext  = mime.split('/')[1] || 'jpg';
  // Nombre fijo por usuario — sobreescribe el anterior automáticamente buscando por nombre
  var fileName = 'avatar_' + user.email.replace(/[^a-z0-9]/gi, '_') + '.' + ext;

  var folder = getFolder_('avatars');

  // Eliminar avatar anterior del mismo usuario si existe
  var existing = folder.getFilesByName(fileName);
  while (existing.hasNext()) existing.next().setTrashed(true);

  var url = saveToDrive_(payload.base64, fileName, mime, folder);

  // Persistir en settings para que el cliente la lea en el siguiente login
  setSetting_({ key: 'avatar_url', value: url }, user);

  audit_('uploadAvatar', 'settings', 'avatar_url', { url: url }, user.email);
  return { avatar_url: url };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER — doPost / doGet  (punto de entrada de la Web App)
// ─────────────────────────────────────────────────────────────────────────────

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ success: false, error: { code: 'VALIDATION_ERROR', message: 'JSON inválido.' } });
  }

  try {
    var user = verifyToken_(req.idToken);
    checkAndStoreIdempotency_(req.idempotencyId);
    var data = dispatch_(req.action, req.payload || {}, user, req.idempotencyId);
    return jsonOut_({ success: true, data: data });
  } catch (err) {
    var code = err && err.code ? err.code : 'SERVER_ERROR';
    var message = err && err.message ? err.message : String(err);
    return jsonOut_({ success: false, error: { code: code, message: message } });
  }
}

function doGet() {
  return jsonOut_({ success: true, data: { status: 'ok', name: 'ctlmoney-backend' } });
}

function dispatch_(action, payload, user, idem) {
  switch (action) {
    case 'initializeSpreadsheet':   return initializeSpreadsheet();
    case 'migrateSchema':           return migrateSchema(payload.seed === true);
    case 'listTransactions':        return listTransactions_(payload);
    case 'getTransactionSummary':   return getTransactionSummary_(payload);
    case 'createTransaction':       return createTransaction_(payload, user, idem);
    case 'updateTransaction':       return updateTransaction_(payload, user, idem);
    case 'deleteTransaction':       return deleteTransaction_(payload, user, idem);
    case 'listAccounts':            return listAccounts_();
    case 'getAccountBalances':      return getAccountBalances_();
    case 'createAccount':           return createAccount_(payload, user, idem);
    case 'updateAccount':           return updateAccount_(payload, user, idem);
    case 'archiveAccount':          return archiveAccount_(payload, user, idem);
    case 'listCategories':          return listCategories_();
    case 'createCategory':          return createCategory_(payload, user, idem);
    case 'updateCategory':          return updateCategory_(payload, user, idem);
    case 'deleteCategory':          return deleteCategory_(payload, user, idem);
    case 'listBudgets':             return listBudgets_();
    case 'createBudget':            return createBudget_(payload, user);
    case 'updateBudget':            return updateBudget_(payload, user);
    case 'deleteBudget':            return deleteBudget_(payload, user);
    case 'listRecurringRules':      return listRecurringRules_();
    case 'createRecurringRule':     return createRecurringRule_(payload, user);
    case 'updateRecurringRule':     return updateRecurringRule_(payload, user);
    case 'deleteRecurringRule':     return deleteRecurringRule_(payload, user);
    case 'getAllSettings':           return getAllSettings_();
    case 'setSetting':              return setSetting_(payload, user);
    case 'listGoals':               return listGoals_();
    case 'createGoal':              return createGoal_(payload, user);
    case 'updateGoal':              return updateGoal_(payload, user);
    case 'deleteGoal':              return deleteGoal_(payload, user);
    case 'listInstallments':        return listInstallments_();
    case 'createInstallment':       return createInstallment_(payload, user);
    case 'updateInstallment':       return updateInstallment_(payload, user);
    case 'deleteInstallment':       return deleteInstallment_(payload, user);
    case 'exportData':              return exportData_(payload);
    case 'uploadReceipt':           return uploadReceipt_(payload, user);
    case 'uploadAvatar':            return uploadAvatar_(payload, user);
    default:
      throw new ApiErr('VALIDATION_ERROR', 'Acción desconocida: ' + action);
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
