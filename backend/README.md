# Backend ctlmoney — Google Apps Script

El Spreadsheet del usuario es la base de datos. Cada hoja = tabla (ver `Schema.gs`).

## Despliegue (una sola vez)

1. Crea un Google Spreadsheet nuevo (será tu base de datos privada).
2. `Extensiones → Apps Script`. Borra `Code.gs` por defecto.
3. Crea un archivo por cada `.gs` de esta carpeta y pega su contenido:
   `Code.gs`, `Schema.gs`, `Setup.gs`, `Util.gs`, `Auth.gs`, `IdempotencyStore.gs`,
   `Transactions.gs`, `Accounts.gs`, `Categories.gs`, `Settings.gs`.
4. Ejecuta una vez la función **`initializeSpreadsheet`** desde el editor
   (selecciónala en la barra y pulsa *Ejecutar*). Autoriza los permisos.
   Esto crea **todas las hojas con sus encabezados** y el seed inicial. Es idempotente:
   volver a ejecutarla no borra datos, solo repara estructura faltante.
5. `Implementar → Nueva implementación → Aplicación web`:
   - **Ejecutar como:** yo (el dueño).
   - **Quién tiene acceso:** cualquiera.
   - Copia la URL `.../exec` → es tu `VITE_GAS_ENDPOINT`.
6. (Opcional pero recomendado) en `Auth.gs`, fija `ALLOWED_CLIENT_ID` con tu OAuth Client ID
   para que el backend verifique la audiencia del token.

## Notas

- Toda escritura valida el `idToken` de Google (`Auth.gs`) y se registra en `audit_log`.
- Las mutaciones usan `idempotencyId` para evitar duplicados ante reintentos.
- Los agregados (totales del mes, balances) se calculan en el servidor; nunca se
  devuelven filas crudas masivas para que el cliente sume.
- Montos siempre como ENTERO en unidades menores (centavos). Las columnas `*_minor`
  se formatean como entero al crear las hojas.
