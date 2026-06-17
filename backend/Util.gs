/**
 * Util.gs — Helpers de acceso a hojas (mapeo fila ↔ objeto), respuestas y audit log.
 * Las queries de agregado se ejecutan en memoria aquí (Array.filter/reduce);
 * NUNCA se devuelven filas crudas masivas al cliente para que él agregue.
 */

function sheet_(name) {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!s) throw new Error('Hoja inexistente: ' + name + '. Ejecuta initializeSpreadsheet.');
  return s;
}

/** Lee todas las filas de una hoja como array de objetos (según SCHEMA). */
function readAll_(name) {
  var sheet = sheet_(name);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var headers = SCHEMA[name];
  var values = sheet.getRange(2, 1, last - 1, headers.length).getValues();
  return values.map(function (row) {
    var obj = {};
    for (var i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
    return obj;
  });
}

/** Encuentra el número de fila (1-based, incluye encabezado) de un id; -1 si no existe. */
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

/** Inserta un objeto como nueva fila al final, respetando el orden de SCHEMA. */
function appendRow_(name, obj) {
  var sheet = sheet_(name);
  var row = SCHEMA[name].map(function (field) {
    return obj[field] !== undefined ? obj[field] : '';
  });
  sheet.appendRow(row);
  return obj;
}

/** Reescribe una fila existente por id. */
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

/** Error de negocio con código tipado. */
function ApiErr(code, message) {
  this.code = code;
  this.message = message;
}

function nowIso_() {
  return new Date().toISOString();
}

/** Registro inmutable de toda escritura. */
function audit_(action, entity, entityId, payload, email) {
  try {
    var hash = Utilities.base64Encode(
      Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(payload || {})),
    );
    sheet_('audit_log').appendRow([nowIso_(), action, entity, entityId, hash, email || '']);
  } catch (e) {
    // El audit no debe bloquear la operación principal.
  }
}
