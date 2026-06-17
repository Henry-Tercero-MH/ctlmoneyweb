/**
 * Auth.gs — Validación del Google ID token.
 * El cliente envía `idToken` (JWT de Google Sign-In) en cada request.
 * Lo validamos contra el endpoint tokeninfo de Google y extraemos el email.
 */

var ALLOWED_CLIENT_ID = ''; // (opcional) fija aquí tu OAuth Client ID para verificar 'aud'.

/** Devuelve { email, name } o lanza ApiErr('AUTH_ERROR'). */
function verifyToken_(idToken) {
  if (!idToken) throw new ApiErr('AUTH_ERROR', 'Falta idToken.');

  var url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new ApiErr('AUTH_ERROR', 'Token inválido o expirado.');
  }
  var info = JSON.parse(res.getContentText());

  // Verifica expiración.
  if (info.exp && Number(info.exp) * 1000 < Date.now()) {
    throw new ApiErr('AUTH_ERROR', 'Token expirado.');
  }
  // Verifica audiencia si está configurada.
  if (ALLOWED_CLIENT_ID && info.aud !== ALLOWED_CLIENT_ID) {
    throw new ApiErr('AUTH_ERROR', 'Audiencia de token no autorizada.');
  }
  if (info.email_verified !== 'true' && info.email_verified !== true) {
    throw new ApiErr('AUTH_ERROR', 'Correo no verificado.');
  }

  return { email: info.email, name: info.name || info.email };
}
