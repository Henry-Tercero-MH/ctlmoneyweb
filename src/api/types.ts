/** Tipos del contrato API (Apps Script ↔ Cliente) y DTOs de entidades. */

export interface ApiRequest<P = unknown> {
  action: string;
  idToken: string;
  idempotencyId?: string;
  payload: P;
}

export interface ApiError {
  code:
    | 'DUPLICATE_IDEMPOTENCY'
    | 'VALIDATION_ERROR'
    | 'AUTH_ERROR'
    | 'NOT_FOUND'
    | 'SERVER_ERROR'
    | 'NETWORK_ERROR'
    | 'TIMEOUT';
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// ── Entidades (tal cual viajan por el API; montos en unidades menores) ──

export type AccountType = 'cash' | 'bank' | 'card' | 'savings' | 'investment';
export type CategoryKind = 'income' | 'expense';
export type TransactionKind = 'income' | 'expense' | 'transfer';

export interface AccountDTO {
  id: string;
  name: string;
  type: AccountType;
  initial_balance_minor: number;
  currency: string;
  archived: boolean;
  created_at: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  parent_id: string;
  is_system: boolean;
  sort_order: number;
}

export interface TransactionDTO {
  id: string;
  account_id: string;
  category_id: string;
  kind: TransactionKind;
  amount_minor: number;
  date: string; // YYYY-MM-DD
  note: string;
  transfer_account_id: string;
  recurring_id: string;
  idempotency_id: string;
  created_at: string;
  updated_at: string;
}

export interface AccountBalanceDTO {
  account_id: string;
  balance_minor: number;
}

export interface TransactionSummaryDTO {
  yearMonth: string;
  income_minor: number;
  expense_minor: number;
  net_minor: number;
  by_category: Array<{ category_id: string; amount_minor: number }>;
  daily: Array<{ date: string; expense_minor: number; income_minor: number }>;
}

// ── Payloads de mutación ──

export interface CreateTransactionPayload {
  id: string;
  account_id: string;
  category_id: string;
  kind: TransactionKind;
  amount_minor: number;
  date: string;
  note: string;
  transfer_account_id?: string;
}

export type UpdateTransactionPayload = CreateTransactionPayload;

export interface ListTransactionsPayload {
  yearMonth?: string;
  accountId?: string;
  categoryId?: string;
  search?: string;
}
