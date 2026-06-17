/**
 * Setup.gs — Inicialización del Spreadsheet.
 *
 * `initializeSpreadsheet()` es IDEMPOTENTE:
 *   - Crea las hojas que falten (definidas en Schema.gs).
 *   - Escribe/repara la fila de encabezados de cada hoja sin tocar los datos.
 *   - Crea los rangos nombrados de índice.
 *   - Inserta el seed inicial (categorías de sistema + cuenta "Efectivo") solo si está vacío.
 *
 * Puede ejecutarse manualmente desde el editor de Apps Script (botón "Ejecutar")
 * o invocarse vía API con la acción `initializeSpreadsheet`.
 */

function initializeSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var created = [];

  // 1) Crear hojas faltantes y reparar encabezados.
  Object.keys(SCHEMA).forEach(function (sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      created.push(sheetName);
    }
    writeHeaders_(sheet, SCHEMA[sheetName]);
  });

  // 2) Crear rangos nombrados de índice.
  setupNamedRanges_(ss);

  // 3) Seed inicial (solo si no hay datos).
  seedCategories_(ss);
  seedDefaultAccount_(ss);
  seedDefaultSettings_(ss);

  // 4) Eliminar la hoja "Sheet1"/"Hoja 1" por defecto si quedó vacía.
  removeDefaultSheet_(ss);

  return { created: created };
}

/** Escribe la fila 1 de encabezados, congela la fila y aplica formato básico. */
function writeHeaders_(sheet, headers) {
  var range = sheet.getRange(1, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold');
  range.setBackground('#161513');
  range.setFontColor('#e8b923');
  sheet.setFrozenRows(1);
  // Asegura que las columnas de monto se traten como texto-entero (sin decimales).
  ensureIntegerColumns_(sheet, headers);
}

/** Fuerza formato de número entero ("0") en columnas *_minor para no perder centavos. */
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
      try {
        ss.setNamedRange(name, range);
      } catch (e) {
        // El rango ya existe o el nombre colisiona; ignorar en modo idempotente.
      }
    });
  });
}

function seedCategories_(ss) {
  var sheet = ss.getSheetByName('categories');
  if (sheet.getLastRow() > 1) return; // ya tiene datos

  var expense = [
    'Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Educación', 'Deudas',
    'Entretenimiento', 'Ropa', 'Servicios', 'Suscripciones', 'Regalos', 'Mascotas',
    'Imprevistos', 'Otros',
  ];
  var income = ['Salario', 'Negocio', 'Freelance', 'Inversiones', 'Otros'];

  var rows = [];
  var order = 0;
  expense.forEach(function (name) {
    rows.push([Utilities.getUuid(), name, 'expense', slug_(name), '#d4a017', '', true, order++]);
  });
  income.forEach(function (name) {
    rows.push([Utilities.getUuid(), name, 'income', slug_(name), '#3f7a3a', '', true, order++]);
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
      try {
        ss.deleteSheet(s);
      } catch (e) {}
    }
  });
}

/** Slug simple para usar como nombre de icono (lucide). */
function slug_(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
}
