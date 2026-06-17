/** Settings.gs — clave/valor de configuración del perfil. */

function getAllSettings_() {
  var rows = readAll_('settings');
  var out = {};
  rows.forEach(function (r) {
    out[r.key] = String(r.value);
  });
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
