/**
 * IdempotencyStore.gs — Previene escrituras duplicadas ante reintentos del cliente.
 * Cada mutación lleva un idempotencyId (UUID). Registramos los vistos en las últimas 24h.
 * Si llega uno repetido, lanzamos DUPLICATE_IDEMPOTENCY y el cliente lo trata como éxito.
 */

var IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

/** Lanza ApiErr('DUPLICATE_IDEMPOTENCY') si el id ya fue procesado; si no, lo registra. */
function checkAndStoreIdempotency_(idempotencyId) {
  if (!idempotencyId) return; // acciones de solo lectura no lo requieren
  var sheet = sheet_('_idempotency');
  var last = sheet.getLastRow();
  var now = Date.now();

  if (last >= 2) {
    var rows = sheet.getRange(2, 1, last - 1, 2).getValues();
    var keepFromRow = -1;
    for (var i = 0; i < rows.length; i++) {
      var id = String(rows[i][0]);
      var created = new Date(rows[i][1]).getTime();
      if (id === String(idempotencyId) && now - created < IDEMPOTENCY_TTL_MS) {
        throw new ApiErr('DUPLICATE_IDEMPOTENCY', 'Operación ya procesada.');
      }
      if (now - created >= IDEMPOTENCY_TTL_MS && keepFromRow === -1) {
        keepFromRow = i; // marca el bloque caducado para poda
      }
    }
    // Poda perezosa de entradas caducadas (mantiene la hoja pequeña).
    if (keepFromRow !== -1) {
      var expired = 0;
      for (var j = 0; j < rows.length; j++) {
        if (now - new Date(rows[j][1]).getTime() >= IDEMPOTENCY_TTL_MS) expired++;
      }
      if (expired > 0) sheet.deleteRows(2, expired);
    }
  }

  sheet.appendRow([idempotencyId, nowIso_()]);
}
