import { callApi } from '../appsScript';
import type { GoalDTO } from '../types';

export interface UpsertGoalPayload {
  id: string;
  name: string;
  target_minor: number;
  target_date: string;       // YYYY-MM-DD  (vacío = sin fecha)
  linked_account_id: string; // vacío = sin cuenta vinculada
}

export const goalsApi = {
  list: () => callApi<GoalDTO[]>('listGoals', {}),
  create: (payload: UpsertGoalPayload, idempotencyId: string) =>
    callApi<GoalDTO>('createGoal', payload, { idempotencyId }),
  update: (payload: UpsertGoalPayload, idempotencyId: string) =>
    callApi<GoalDTO>('updateGoal', payload, { idempotencyId }),
  remove: (id: string, idempotencyId: string) =>
    callApi<{ id: string }>('deleteGoal', { id }, { idempotencyId }),
};
