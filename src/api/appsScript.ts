/** Cliente HTTP base para Apps Script: fetch + auth header + retry con backoff. */
import { API_ENDPOINT, MAX_RETRIES, RETRY_DELAYS_MS, REQUEST_TIMEOUT_MS } from '@/core/constants';
import { useAuthStore } from '@/stores/authStore';
import type { ApiRequest, ApiResponse, ApiError } from './types';

// Campos que deben ser números — Google Sheets los puede devolver como string o float
const NUMERIC_FIELDS = new Set([
  'amount_minor', 'initial_balance_minor', 'balance_minor',
  'limit_minor', 'target_minor', 'sort_order',
  'income_minor', 'expense_minor', 'net_minor',
  'total_minor', 'installment_count', 'paid_count',
]);

function coerceNumbers<T>(data: T): T {
  if (Array.isArray(data)) return data.map(coerceNumbers) as unknown as T;
  if (data !== null && typeof data === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (NUMERIC_FIELDS.has(k) && (typeof v === 'string' || typeof v === 'number')) {
        out[k] = Math.round(parseFloat(String(v)) || 0);
      } else if (v !== null && typeof v === 'object') {
        out[k] = coerceNumbers(v);
      } else {
        out[k] = v;
      }
    }
    return out as T;
  }
  return data;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class ApiException extends Error {
  constructor(public readonly apiError: ApiError) {
    super(apiError.message);
    this.name = 'ApiException';
  }
}

/** Realiza una acción contra el backend. Reintenta ante errores de red/timeout/5xx.
 *  NO reintenta DUPLICATE_IDEMPOTENCY ni VALIDATION_ERROR. */
export async function callApi<T, P = unknown>(
  action: string,
  payload: P,
  opts: { idempotencyId?: string } = {},
): Promise<T> {
  if (!API_ENDPOINT) {
    throw new ApiException({ code: 'SERVER_ERROR', message: 'VITE_GAS_ENDPOINT no configurado.' });
  }

  const idToken = useAuthStore.getState().idToken;
  if (!idToken) {
    throw new ApiException({ code: 'AUTH_ERROR', message: 'Sesión no iniciada.' });
  }

  const body: ApiRequest<P> = { action, idToken, payload, ...opts };

  let lastError: ApiError = { code: 'NETWORK_ERROR', message: 'Error de red desconocido.' };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        // text/plain evita preflight CORS contra Apps Script.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timer);

      if (res.status === 401) {
        await useAuthStore.getState().refresh();
        lastError = { code: 'AUTH_ERROR', message: 'Token expirado, reintentando.' };
        continue;
      }
      if (res.status >= 500) {
        lastError = { code: 'SERVER_ERROR', message: `Servidor respondió ${res.status}.` };
        await delay(RETRY_DELAYS_MS[attempt] ?? 4000);
        continue;
      }

      const json = (await res.json()) as ApiResponse<T>;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(`[api] ${action}`, json.success ? json.data : json.error);
      }
      if (json.success && json.data !== undefined) return coerceNumbers(json.data) as T;
      if (json.error) {
        // Errores de negocio: no reintentar.
        if (json.error.code === 'DUPLICATE_IDEMPOTENCY' || json.error.code === 'VALIDATION_ERROR') {
          throw new ApiException(json.error);
        }
        lastError = json.error;
      }
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof ApiException) throw e;
      const isAbort = e instanceof DOMException && e.name === 'AbortError';
      lastError = isAbort
        ? { code: 'TIMEOUT', message: 'La solicitud tardó demasiado.' }
        : { code: 'NETWORK_ERROR', message: 'No hay conexión con el servidor.' };
      // eslint-disable-next-line no-console
      console.warn(`[appsScript] intento ${attempt + 1} falló (${action})`, {
        idempotencyId: opts.idempotencyId,
        error: lastError,
      });
    }
    if (attempt < MAX_RETRIES - 1) await delay(RETRY_DELAYS_MS[attempt] ?? 1000);
  }

  throw new ApiException(lastError);
}
