import { callApi } from '../appsScript';
import type {
  RecurringRuleDTO,
  CreateRecurringPayload,
  UpdateRecurringPayload,
} from '../types';

export const recurringApi = {
  list: () =>
    callApi<RecurringRuleDTO[]>('listRecurringRules', {}),

  create: (payload: CreateRecurringPayload, idempotencyId: string) =>
    callApi<RecurringRuleDTO>('createRecurringRule', payload, { idempotencyId }),

  update: (payload: UpdateRecurringPayload, idempotencyId: string) =>
    callApi<RecurringRuleDTO>('updateRecurringRule', payload, { idempotencyId }),

  remove: (id: string, idempotencyId: string) =>
    callApi<{ id: string }>('deleteRecurringRule', { id }, { idempotencyId }),
};
