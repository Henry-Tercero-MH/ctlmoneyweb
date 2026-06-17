import { callApi } from '../appsScript';
import type {
  TransactionDTO,
  TransactionSummaryDTO,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  ListTransactionsPayload,
} from '../types';

export const transactionsApi = {
  list: (payload: ListTransactionsPayload) =>
    callApi<TransactionDTO[]>('listTransactions', payload),

  summary: (yearMonth: string) =>
    callApi<TransactionSummaryDTO>('getTransactionSummary', { yearMonth }),

  create: (payload: CreateTransactionPayload, idempotencyId: string) =>
    callApi<TransactionDTO>('createTransaction', payload, { idempotencyId }),

  update: (payload: UpdateTransactionPayload, idempotencyId: string) =>
    callApi<TransactionDTO>('updateTransaction', payload, { idempotencyId }),

  remove: (id: string, idempotencyId: string) =>
    callApi<{ id: string }>('deleteTransaction', { id }, { idempotencyId }),
};
