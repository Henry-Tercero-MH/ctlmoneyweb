import { callApi } from '../appsScript';
import type {
  BudgetDTO,
  CreateBudgetPayload,
  UpdateBudgetPayload,
} from '../types';

export const budgetsApi = {
  list: () =>
    callApi<BudgetDTO[]>('listBudgets', {}),

  create: (payload: CreateBudgetPayload, idempotencyId: string) =>
    callApi<BudgetDTO>('createBudget', payload, { idempotencyId }),

  update: (payload: UpdateBudgetPayload, idempotencyId: string) =>
    callApi<BudgetDTO>('updateBudget', payload, { idempotencyId }),

  remove: (id: string, idempotencyId: string) =>
    callApi<{ id: string }>('deleteBudget', { id }, { idempotencyId }),
};
