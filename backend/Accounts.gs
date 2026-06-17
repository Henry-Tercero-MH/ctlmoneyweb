/** Accounts.gs — CRUD de cuentas y cálculo de balances (en servidor). */

function listAccounts_() {
  return readAll_('accounts').filter(function (a) {
    return a.archived !== true && a.archived !== 'TRUE';
  });
}

/** Balance = initial_balance_minor + ingresos − gastos por cuenta. Calculado en servidor. */
function getAccountBalances_() {
  var accounts = readAll_('accounts');
  var txns = readAll_('transactions');
  var map = {};
  accounts.forEach(function (a) {
    map[a.id] = Number(a.initial_balance_minor) || 0;
  });
  txns.forEach(function (t) {
    var amt = Number(t.amount_minor) || 0;
    if (map[t.account_id] === undefined) return;
    if (t.kind === 'income') map[t.account_id] += amt;
    else if (t.kind === 'expense') map[t.account_id] -= amt;
    else if (t.kind === 'transfer') map[t.account_id] -= amt; // débito en cuenta de la fila
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
