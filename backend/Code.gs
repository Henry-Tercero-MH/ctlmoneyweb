/**
 * Code.gs — Router principal de la Web App.
 * Punto de entrada único: doPost. Despacha por `action`.
 * Despliegue: "Implementar > Nueva implementación > Aplicación web".
 *   - Ejecutar como: yo (el dueño del Spreadsheet).
 *   - Quién tiene acceso: cualquiera (la app valida el ID token de Google).
 */

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

/** doGet sirve solo para un health-check manual del despliegue. */
function doGet() {
  return jsonOut_({ success: true, data: { status: 'ok', name: 'ctlmoney-backend' } });
}

function dispatch_(action, payload, user, idem) {
  switch (action) {
    // Setup
    case 'initializeSpreadsheet': return initializeSpreadsheet();

    // Transactions
    case 'listTransactions': return listTransactions_(payload);
    case 'getTransactionSummary': return getTransactionSummary_(payload);
    case 'createTransaction': return createTransaction_(payload, user, idem);
    case 'updateTransaction': return updateTransaction_(payload, user, idem);
    case 'deleteTransaction': return deleteTransaction_(payload, user, idem);

    // Accounts
    case 'listAccounts': return listAccounts_();
    case 'getAccountBalances': return getAccountBalances_();
    case 'createAccount': return createAccount_(payload, user, idem);
    case 'updateAccount': return updateAccount_(payload, user, idem);
    case 'archiveAccount': return archiveAccount_(payload, user, idem);

    // Categories
    case 'listCategories': return listCategories_();
    case 'createCategory': return createCategory_(payload, user, idem);
    case 'updateCategory': return updateCategory_(payload, user, idem);
    case 'deleteCategory': return deleteCategory_(payload, user, idem);

    // Settings
    case 'getAllSettings': return getAllSettings_();
    case 'setSetting': return setSetting_(payload, user);

    default:
      throw new ApiErr('VALIDATION_ERROR', 'Acción desconocida: ' + action);
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
