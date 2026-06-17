/** Transactions.gs — CRUD de transacciones + listados y agregados del mes. */

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

  rows.sort(function (a, b) {
    return String(b.date).localeCompare(String(a.date));
  });
  return rows;
}

/** Agregados del mes calculados EN EL SERVIDOR (no se mandan filas crudas para sumar). */
function getTransactionSummary_(payload) {
  var ym = payload.yearMonth;
  var rows = readAll_('transactions').filter(function (t) {
    return String(t.date).slice(0, 7) === ym && t.kind !== 'transfer';
  });

  var income = 0;
  var expense = 0;
  var byCat = {};
  var daily = {};

  rows.forEach(function (t) {
    var amt = Number(t.amount_minor) || 0;
    if (t.kind === 'income') income += amt;
    else expense += amt;

    if (t.kind === 'expense') {
      byCat[t.category_id] = (byCat[t.category_id] || 0) + amt;
    }
    var d = String(t.date);
    if (!daily[d]) daily[d] = { date: d, expense_minor: 0, income_minor: 0 };
    if (t.kind === 'income') daily[d].income_minor += amt;
    else daily[d].expense_minor += amt;
  });

  var byCategory = Object.keys(byCat).map(function (cid) {
    return { category_id: cid, amount_minor: byCat[cid] };
  });
  var dailyArr = Object.keys(daily)
    .map(function (k) { return daily[k]; })
    .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });

  return {
    yearMonth: ym,
    income_minor: income,
    expense_minor: expense,
    net_minor: income - expense,
    by_category: byCategory,
    daily: dailyArr,
  };
}

function createTransaction_(payload, user, idem) {
  validateTransaction_(payload);
  var now = nowIso_();

  // Transferencia: dos filas (débito en origen, crédito en destino).
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
    created_at: now,
    updated_at: now,
  };
}

function updateTransaction_(payload, user, idem) {
  validateTransaction_(payload);
  var existing = readAll_('transactions').filter(function (t) { return t.id === payload.id; })[0];
  if (!existing) throw new ApiErr('NOT_FOUND', 'Transacción no encontrada.');
  var txn = buildTxn_(payload, existing.created_at || nowIso_(), payload.account_id,
    payload.transfer_account_id || '');
  txn.updated_at = nowIso_();
  updateRow_('transactions', payload.id, txn);
  audit_('updateTransaction', 'transactions', payload.id, payload, user.email);
  return txn;
}

function deleteTransaction_(payload, user, idem) {
  var res = deleteRow_('transactions', payload.id);
  // Si tenía par de transferencia (crédito), bórralo también.
  var creditId = payload.id + '-credit';
  if (findRowById_('transactions', creditId) !== -1) deleteRow_('transactions', creditId);
  audit_('deleteTransaction', 'transactions', payload.id, payload, user.email);
  return res;
}

function validateTransaction_(p) {
  if (!p.id) throw new ApiErr('VALIDATION_ERROR', 'Falta id.');
  if (['income', 'expense', 'transfer'].indexOf(p.kind) === -1) {
    throw new ApiErr('VALIDATION_ERROR', 'kind inválido.');
  }
  if (!Number.isFinite(Number(p.amount_minor)) || Number(p.amount_minor) <= 0) {
    throw new ApiErr('VALIDATION_ERROR', 'Monto inválido.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(p.date))) {
    throw new ApiErr('VALIDATION_ERROR', 'Fecha inválida (YYYY-MM-DD).');
  }
  if (!p.account_id) throw new ApiErr('VALIDATION_ERROR', 'Falta cuenta.');
}
