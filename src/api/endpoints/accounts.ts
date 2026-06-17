import { callApi } from '../appsScript';
import type { AccountDTO, AccountBalanceDTO, AccountType } from '../types';

export interface UpsertAccountPayload {
  id: string;
  name: string;
  type: AccountType;
  initial_balance_minor: number;
  currency: string;
}

export const accountsApi = {
  list: () => callApi<AccountDTO[]>('listAccounts', {}),
  balances: () => callApi<AccountBalanceDTO[]>('getAccountBalances', {}),
  create: (payload: UpsertAccountPayload, idempotencyId: string) =>
    callApi<AccountDTO>('createAccount', payload, { idempotencyId }),
  update: (payload: UpsertAccountPayload, idempotencyId: string) =>
    callApi<AccountDTO>('updateAccount', payload, { idempotencyId }),
  archive: (id: string, idempotencyId: string) =>
    callApi<{ id: string }>('archiveAccount', { id }, { idempotencyId }),
};
